import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const serverClient = await createClient()
    const { data: { user }, error: authError } = await serverClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { playbook, rules, confluences, tradeDetails, examples, indicators, rubric, deletedIds } = body

    const adminClient = createAdminClient()

    // Ensure the playbook belongs to the authenticated user
    playbook.user_id = user.id

    let playbookId = playbook.id || null

    // Insert or update the playbook
    if (!playbookId) {
      delete playbook.id
      const { data, error } = await adminClient
        .from('playbooks')
        .insert(playbook)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: `Playbook insert failed: ${error.message}` }, { status: 500 })
      }
      playbookId = data.id
    } else {
      const { error } = await adminClient
        .from('playbooks')
        .update(playbook)
        .eq('id', playbookId)
        .eq('user_id', user.id)

      if (error) {
        return NextResponse.json({ error: `Playbook update failed: ${error.message}` }, { status: 500 })
      }
    }

    // Upsert rules
    if (rules && rules.length > 0) {
      const rulePayload = rules.map((rule: any, index: number) => ({
        id: rule.id,
        playbook_id: playbookId,
        label: (rule.label || '').trim(),
        type: rule.type,
        weight: Number(rule.weight) || 0,
        sort: index,
      }))
      const { error } = await adminClient.from('playbook_rules').upsert(rulePayload)
      if (error) {
        return NextResponse.json({ error: `Rules save failed: ${error.message}` }, { status: 500 })
      }
    }

    // Upsert confluences
    if (confluences && confluences.length > 0) {
      const confPayload = confluences.map((conf: any, index: number) => ({
        id: conf.id,
        playbook_id: playbookId,
        label: (conf.label || '').trim(),
        weight: Number(conf.weight) || 0,
        primary_confluence: conf.primary_confluence,
        sort: index,
      }))
      const { error } = await adminClient.from('playbook_confluences').upsert(confPayload)
      if (error) {
        return NextResponse.json({ error: `Confluences save failed: ${error.message}` }, { status: 500 })
      }
    }

    // Upsert trade details
    if (tradeDetails && tradeDetails.length > 0) {
      const detailPayload = tradeDetails
        .filter((d: any) => (d.label || '').trim().length > 0)
        .map((d: any, index: number) => ({
          id: d.id,
          playbook_id: playbookId,
          label: d.label.trim(),
          type: d.type,
          weight: Number(d.weight) || 1,
          primary_item: d.primary_item,
          sort: index,
        }))
      if (detailPayload.length > 0) {
        const { error } = await adminClient.from('playbook_trade_details').upsert(detailPayload)
        if (error) {
          return NextResponse.json({ error: `Trade details save failed: ${error.message}` }, { status: 500 })
        }
      }
    }

    // Upsert examples
    if (examples && examples.length > 0) {
      const examplePayload = examples
        .filter((e: any) => e.media_urls && e.media_urls.length > 0)
        .map((e: any, index: number) => ({
          id: e.id,
          playbook_id: playbookId,
          media_urls: e.media_urls,
          caption: e.caption || null,
          sort: index,
        }))
      if (examplePayload.length > 0) {
        const { error } = await adminClient.from('playbook_examples').upsert(examplePayload)
        if (error) {
          return NextResponse.json({ error: `Examples save failed: ${error.message}` }, { status: 500 })
        }
      }
    }

    // Upsert indicators
    if (indicators && indicators.length > 0) {
      const indicatorPayload = indicators
        .filter((i: any) => (i.name || '').trim().length > 0 && (i.url || '').trim().length > 0)
        .map((i: any, index: number) => ({
          id: i.id,
          playbook_id: playbookId,
          name: i.name.trim(),
          url: i.url.trim(),
          description: i.description || null,
          sort: index,
        }))
      if (indicatorPayload.length > 0) {
        const { error } = await adminClient.from('playbook_indicators').upsert(indicatorPayload)
        if (error) {
          return NextResponse.json({ error: `Indicators save failed: ${error.message}` }, { status: 500 })
        }
      }
    }

    // Handle deletions
    if (deletedIds) {
      if (deletedIds.rules?.length > 0) {
        await adminClient.from('playbook_rules').delete().in('id', deletedIds.rules)
      }
      if (deletedIds.confluences?.length > 0) {
        await adminClient.from('playbook_confluences').delete().in('id', deletedIds.confluences)
      }
      if (deletedIds.details?.length > 0) {
        await adminClient.from('playbook_trade_details').delete().in('id', deletedIds.details)
      }
      if (deletedIds.examples?.length > 0) {
        await adminClient.from('playbook_examples').delete().in('id', deletedIds.examples)
      }
      if (deletedIds.indicators?.length > 0) {
        await adminClient.from('playbook_indicators').delete().in('id', deletedIds.indicators)
      }
    }

    // Upsert rubric
    if (rubric) {
      const rubricPayload = {
        ...rubric,
        playbook_id: playbookId,
        grade_cutoffs: rubric.grade_cutoffs ? Object.fromEntries(
          Object.entries(rubric.grade_cutoffs).map(([grade, value]: [string, any]) => [
            grade.trim(),
            Number(value) || 0,
          ])
        ) : {},
      }
      const { error } = await adminClient.from('playbook_rubric').upsert(rubricPayload)
      if (error) {
        return NextResponse.json({ error: `Rubric save failed: ${error.message}` }, { status: 500 })
      }
    }

    return NextResponse.json({ id: playbookId })
  } catch (err: any) {
    console.error('[API /playbooks] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
