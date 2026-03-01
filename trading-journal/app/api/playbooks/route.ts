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

    // Build all payloads
    const rulePayload = (rules && rules.length > 0)
      ? rules.map((rule: any, index: number) => ({
          id: rule.id,
          playbook_id: playbookId,
          label: (rule.label || '').trim(),
          type: rule.type,
          weight: Number(rule.weight) || 0,
          sort: index,
        }))
      : null

    const confPayload = (confluences && confluences.length > 0)
      ? confluences.map((conf: any, index: number) => ({
          id: conf.id,
          playbook_id: playbookId,
          label: (conf.label || '').trim(),
          weight: Number(conf.weight) || 0,
          primary_confluence: conf.primary_confluence,
          sort: index,
        }))
      : null

    const detailPayload = (tradeDetails && tradeDetails.length > 0)
      ? tradeDetails
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
      : null

    const examplePayload = (examples && examples.length > 0)
      ? examples
          .filter((e: any) => e.media_urls && e.media_urls.length > 0)
          .map((e: any, index: number) => ({
            id: e.id,
            playbook_id: playbookId,
            media_urls: e.media_urls,
            caption: e.caption || null,
            sort: index,
          }))
      : null

    const indicatorPayload = (indicators && indicators.length > 0)
      ? indicators
          .filter((i: any) => (i.name || '').trim().length > 0 && (i.url || '').trim().length > 0)
          .map((i: any, index: number) => ({
            id: i.id,
            playbook_id: playbookId,
            name: i.name.trim(),
            url: i.url.trim(),
            description: i.description || null,
            sort: index,
          }))
      : null

    const rubricPayload = rubric
      ? {
          ...rubric,
          playbook_id: playbookId,
          grade_cutoffs: rubric.grade_cutoffs ? Object.fromEntries(
            Object.entries(rubric.grade_cutoffs).map(([grade, value]: [string, any]) => [
              grade.trim(),
              Number(value) || 0,
            ])
          ) : {},
        }
      : null

    // Run all upserts + deletions in parallel
    const [
      rulesRes, confRes, detailRes, exampleRes, indicatorRes, rubricRes,
      delRules, delConf, delDetails, delExamples, delIndicators,
    ] = await Promise.all([
      rulePayload?.length ? adminClient.from('playbook_rules').upsert(rulePayload) : null,
      confPayload?.length ? adminClient.from('playbook_confluences').upsert(confPayload) : null,
      detailPayload?.length ? adminClient.from('playbook_trade_details').upsert(detailPayload) : null,
      examplePayload?.length ? adminClient.from('playbook_examples').upsert(examplePayload) : null,
      indicatorPayload?.length ? adminClient.from('playbook_indicators').upsert(indicatorPayload) : null,
      rubricPayload ? adminClient.from('playbook_rubric').upsert(rubricPayload) : null,
      deletedIds?.rules?.length ? adminClient.from('playbook_rules').delete().in('id', deletedIds.rules) : null,
      deletedIds?.confluences?.length ? adminClient.from('playbook_confluences').delete().in('id', deletedIds.confluences) : null,
      deletedIds?.details?.length ? adminClient.from('playbook_trade_details').delete().in('id', deletedIds.details) : null,
      deletedIds?.examples?.length ? adminClient.from('playbook_examples').delete().in('id', deletedIds.examples) : null,
      deletedIds?.indicators?.length ? adminClient.from('playbook_indicators').delete().in('id', deletedIds.indicators) : null,
    ])

    const errors = [
      rulesRes?.error && `Rules save failed: ${rulesRes.error.message}`,
      confRes?.error && `Confluences save failed: ${confRes.error.message}`,
      detailRes?.error && `Trade details save failed: ${detailRes.error.message}`,
      exampleRes?.error && `Examples save failed: ${exampleRes.error.message}`,
      indicatorRes?.error && `Indicators save failed: ${indicatorRes.error.message}`,
      rubricRes?.error && `Rubric save failed: ${rubricRes.error.message}`,
    ].filter(Boolean)

    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0] }, { status: 500 })
    }

    void delRules; void delConf; void delDetails; void delExamples; void delIndicators

    return NextResponse.json({ id: playbookId })
  } catch (err: any) {
    console.error('[API /playbooks] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
