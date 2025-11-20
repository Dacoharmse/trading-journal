# Trading Journal - Mentorship Platform Implementation Plan

## 🎯 Overview

Transform the trading journal into a comprehensive mentorship platform where:
- **Admins** manage users, mentors, and platform settings
- **Mentors** review trades, share playbooks, and publish educational content
- **Traders** request reviews, learn from mentors, and access shared resources

---

## 📊 Core Features Breakdown

### 1. User Roles & Permissions System

#### User Roles
```typescript
enum UserRole {
  ADMIN = 'admin',           // Full platform access
  MENTOR = 'mentor',         // Can review trades, share content
  TRADER = 'trader',         // Standard user (default)
  PREMIUM_TRADER = 'premium' // Paid features (future)
}
```

#### Permissions Matrix
| Feature | Admin | Mentor | Trader |
|---------|-------|--------|--------|
| Manage Users | ✅ | ❌ | ❌ |
| Manage Mentors | ✅ | ❌ | ❌ |
| Review Trades | ✅ | ✅ | ❌ |
| Share Playbooks | ✅ | ✅ | ❌ |
| Publish Public Trades | ✅ | ✅ | ❌ |
| Request Reviews | ❌ | ❌ | ✅ |
| Access Own Journal | ✅ | ✅ | ✅ |

---

## 🗄️ Database Schema

### New Tables

#### 1. `user_profiles` (Enhanced)
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'trader' CHECK (role IN ('admin', 'mentor', 'trader', 'premium')),

  -- Mentor-specific fields
  is_mentor BOOLEAN DEFAULT false,
  mentor_bio TEXT,
  mentor_specialties TEXT[], -- e.g., ['Scalping', 'Swing Trading', 'Forex']
  mentor_experience_years INTEGER,
  mentor_approved BOOLEAN DEFAULT false,
  mentor_rating DECIMAL(3,2) DEFAULT 0.00,
  mentor_total_reviews INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `mentor_students` (Mentorship Connections)
```sql
CREATE TABLE mentor_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Settings
  allow_full_journal_access BOOLEAN DEFAULT true,
  notification_enabled BOOLEAN DEFAULT true,

  UNIQUE(mentor_id, student_id)
);
```

#### 3. `trade_reviews`
```sql
CREATE TABLE trade_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  trader_id UUID NOT NULL REFERENCES user_profiles(id),
  mentor_id UUID REFERENCES user_profiles(id),

  -- Review request
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  request_message TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),

  -- Review response
  review_text TEXT,
  review_rating INTEGER CHECK (review_rating BETWEEN 1 AND 5),
  mistakes_identified TEXT[],
  improvements_suggested TEXT[],
  positive_aspects TEXT[],
  reviewed_at TIMESTAMPTZ,

  -- Meta
  is_read BOOLEAN DEFAULT false,

  CONSTRAINT valid_rating CHECK (review_rating IS NULL OR reviewed_at IS NOT NULL)
);
```

#### 4. `review_comments` (Thread Support)
```sql
CREATE TABLE review_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES trade_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id),

  comment_text TEXT NOT NULL,
  parent_comment_id UUID REFERENCES review_comments(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. `shared_playbooks`
```sql
CREATE TABLE shared_playbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES user_profiles(id),

  -- Sharing settings
  is_public BOOLEAN DEFAULT false,
  shared_with_students_only BOOLEAN DEFAULT true,

  -- Analytics
  view_count INTEGER DEFAULT 0,
  copy_count INTEGER DEFAULT 0,

  shared_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6. `public_trades`
```sql
CREATE TABLE public_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES user_profiles(id),

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  key_lessons TEXT[],

  -- Visibility
  is_published BOOLEAN DEFAULT true,

  -- Analytics
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,

  published_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 7. `notifications`
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Notification details
  type TEXT NOT NULL CHECK (type IN (
    'trade_review_request',
    'trade_review_completed',
    'new_comment',
    'playbook_shared',
    'new_public_trade',
    'mentor_assigned',
    'system_message'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Reference to related entity
  reference_id UUID,
  reference_type TEXT,

  -- Status
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 8. `trade_likes` (For Public Trades)
```sql
CREATE TABLE trade_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_trade_id UUID NOT NULL REFERENCES public_trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(public_trade_id, user_id)
);
```

#### 9. `admin_audit_log`
```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES user_profiles(id),

  action TEXT NOT NULL, -- e.g., 'approve_mentor', 'delete_user', 'update_role'
  target_user_id UUID REFERENCES user_profiles(id),
  details JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎨 User Interface Components

### Admin Panel

#### Dashboard (`/admin`)
```
┌─────────────────────────────────────────────┐
│ Admin Dashboard                              │
├─────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │ 1,234│ │  45  │ │  12  │ │  98% │        │
│ │ Users│ │Mentors│ │Pending│ │Uptime│        │
│ └──────┘ └──────┘ └──────┘ └──────┘        │
│                                              │
│ Recent Activity                              │
│ ┌──────────────────────────────────────┐   │
│ │ • User john@email.com registered      │   │
│ │ • Mentor Sarah approved               │   │
│ │ • 5 new trade reviews requested       │   │
│ └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

#### User Management (`/admin/users`)
- Searchable/filterable user list
- Quick actions: Change role, Suspend, Delete
- User details modal with activity history
- Bulk actions support

#### Mentor Management (`/admin/mentors`)
- Pending mentor applications
- Approve/Reject with feedback
- Active mentors list
- Performance metrics per mentor

### Mentor Dashboard

#### Main Dashboard (`/mentor`)
```
┌─────────────────────────────────────────────┐
│ Mentor Dashboard - Welcome Sarah!           │
├─────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │  12  │ │  45  │ │ 4.8⭐│ │  89% │        │
│ │Pending│ │Students│ │Rating│ │Response│     │
│ └──────┘ └──────┘ └──────┘ └──────┘        │
│                                              │
│ Review Requests (Urgent First)               │
│ ┌──────────────────────────────────────┐   │
│ │ [!] @john - EUR/USD Loss -2.5R       │   │
│ │     "Why did I lose on this setup?"   │   │
│ │     [Review] [Assign to Me] [Skip]    │   │
│ ├──────────────────────────────────────┤   │
│ │ @mike - Gold Long +3.2R               │   │
│ │     "Is my entry timing correct?"     │   │
│ └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

#### Notifications Panel (`/mentor/notifications`)
- Real-time notification feed
- Filters: Unread, Reviews, Comments, Mentions
- Mark as read/archive
- Quick action buttons

#### Review Interface (`/mentor/reviews/:id`)
- Split view: Trade details on left, review form on right
- Chart images in gallery view
- Pre-filled feedback templates
- Rating system (1-5 stars)
- Categories: Mistakes, Improvements, Positives

### Trader Features

#### Request Review Modal
```
┌─────────────────────────────────────────────┐
│ Request Trade Review                         │
├─────────────────────────────────────────────┤
│ Your Mentor: [Sarah Johnson ▼]             │
│                                              │
│ What would you like reviewed?                │
│ ┌──────────────────────────────────────┐   │
│ │ Entry timing, risk management...      │   │
│ │                                        │   │
│ └──────────────────────────────────────┘   │
│                                              │
│ Specific Questions (Optional):               │
│ ┌──────────────────────────────────────┐   │
│ │ - Was my stop too tight?              │   │
│ │ - Should I have waited for...         │   │
│ └──────────────────────────────────────┘   │
│                                              │
│ [Cancel]              [Submit Request]       │
└─────────────────────────────────────────────┘
```

#### My Reviews (`/reviews`)
- List of all review requests
- Status badges: Pending, In Progress, Completed
- View mentor feedback
- Reply/discuss in comments

#### Community Feed (`/community`)
- Public trades from mentors
- Filter by symbol, strategy, outcome
- Like and bookmark trades
- Copy playbook from public trade

---

## 🔔 Notification System

### Notification Types

1. **Trade Review Request** (Mentor)
   - "John requested a review for EUR/USD trade"

2. **Review Completed** (Trader)
   - "Sarah completed your trade review with 3 suggestions"

3. **New Comment** (Both)
   - "Sarah replied to your comment on Gold trade review"

4. **Playbook Shared** (Trader)
   - "Sarah shared 'ICT Breaker Block' playbook with you"

5. **New Public Trade** (Trader)
   - "Sarah published a new +5R scalping setup"

6. **Mentor Assigned** (Trader)
   - "You've been assigned to mentor Sarah Johnson"

### Real-time Implementation
- Use Supabase Realtime for instant notifications
- Browser push notifications (optional)
- Email digest for unread notifications
- In-app notification bell with count badge

---

## 🎓 Recommended Additional Features

### 1. **Mentor Leaderboard**
- Top mentors by rating
- Most helpful reviews
- Response time rankings
- Student success rate

### 2. **Mentor Booking System**
- Schedule 1-on-1 review sessions
- Calendar integration
- Video call integration (optional)
- Session notes and recordings

### 3. **Achievement System**
- Badges for traders: "100 Trades Logged", "First Win Streak"
- Badges for mentors: "Reviewed 100 Trades", "5-Star Rating"
- Progression system to gamify learning

### 4. **Mentor Course System**
- Create structured trading courses
- Video lessons, quizzes, assignments
- Progress tracking for students
- Certificate generation

### 5. **Trade Comparison Tool**
- Compare student trade with mentor's approach
- Side-by-side chart analysis
- "What would mentor do differently?"

### 6. **Mentor Analytics Dashboard**
- Student progress over time
- Common mistakes identification
- Success rate improvements
- Engagement metrics

### 7. **Review Templates**
- Pre-made review templates for common scenarios
- "Breakout Entry Analysis"
- "Risk Management Review"
- "Psychology Assessment"

### 8. **Student Groups**
- Mentors can create groups of students
- Group discussions
- Peer review system
- Group challenges

### 9. **Trade Collaboration**
- Mentors can annotate student trade charts
- Drawing tools overlay on images
- Voice notes on specific chart points

### 10. **Mentor Marketplace** (Premium)
- Paid mentorship programs
- Tiered pricing (Basic/Pro/Elite)
- Payment processing integration
- Subscription management

### 11. **Smart Matching System**
- Match traders with mentors based on:
  - Trading style
  - Experience level
  - Preferred markets
  - Time zone
  - Language

### 12. **Review Quality Score**
- AI-powered review quality analysis
- Ensure mentors provide detailed feedback
- Minimum character count
- Required sections completion

### 13. **Mentor Verification System**
- Verify trading credentials
- Performance verification
- Background checks
- Certification badges

### 14. **Student Progress Reports**
- Weekly/monthly automated reports
- Before/after metrics
- Improvement areas
- Next focus areas

### 15. **Mentor Availability Status**
- Online/Offline indicator
- "Accepting reviews" toggle
- Response time estimate
- Vacation mode

---

## 📱 Navigation Structure

### Updated Sidebar

```
Main
├── Dashboard
├── Trades
├── Calendar
├── Analytics
├── Reports

Trading Tools
├── Playbook
├── Backtesting Lab
├── Performance
├── Risk Management

Learning (NEW)
├── My Reviews
├── Request Review
├── Community Feed
├── Shared Playbooks
├── Mentor Profile (if assigned)

Mentor Panel (Role: Mentor)
├── Mentor Dashboard
├── Review Requests
├── My Students
├── Share Playbook
├── Publish Trade
├── Notifications

Admin Panel (Role: Admin)
├── Admin Dashboard
├── User Management
├── Mentor Management
├── System Settings
├── Audit Logs

Data
├── Accounts
└── Settings
```

---

## 🔐 Security & Permissions

### Row Level Security (RLS) Policies

```sql
-- Users can only see their own data
CREATE POLICY "Users view own data"
  ON trades FOR SELECT
  USING (auth.uid() = user_id);

-- Mentors can view assigned students' data
CREATE POLICY "Mentors view students data"
  ON trades FOR SELECT
  USING (
    auth.uid() IN (
      SELECT mentor_id FROM mentor_students
      WHERE student_id = trades.user_id
      AND status = 'active'
    )
  );

-- Admins can view all data
CREATE POLICY "Admins view all"
  ON trades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

### API Middleware
- Role-based route protection
- Permission checks before sensitive operations
- Rate limiting for API endpoints
- Audit logging for admin actions

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema updates
- [ ] User roles and permissions system
- [ ] Admin panel basic structure
- [ ] User profile enhancements

### Phase 2: Mentor System (Week 3-4)
- [ ] Mentor registration flow
- [ ] Mentor approval system
- [ ] Mentor-student assignment
- [ ] Mentor profile pages

### Phase 3: Trade Reviews (Week 5-6)
- [ ] Review request system
- [ ] Review interface for mentors
- [ ] Notification system
- [ ] Comment threads

### Phase 4: Content Sharing (Week 7-8)
- [ ] Playbook sharing system
- [ ] Public trade feed
- [ ] Community page
- [ ] Like/bookmark system

### Phase 5: Polish & Extras (Week 9-10)
- [ ] Analytics dashboards
- [ ] Real-time notifications
- [ ] Mobile responsiveness
- [ ] Performance optimization

---

## 🎯 Success Metrics

### For Admins
- Total platform users
- Active mentor count
- Review completion rate
- User retention rate

### For Mentors
- Average response time
- Student success rate improvement
- Review rating (1-5 stars)
- Student engagement level

### For Traders
- Reviews received
- Win rate improvement
- Playbooks accessed
- Community engagement

---

## 💡 User Experience Flow Examples

### Example 1: Trader Requests Review

1. Trader logs a losing trade
2. Clicks "Request Review" button on trade
3. Selects assigned mentor (or platform assigns)
4. Writes specific questions/concerns
5. Submits request
6. **Mentor receives notification**
7. Mentor reviews trade details and charts
8. Mentor provides detailed feedback
9. **Trader receives notification**
10. Trader reads review, asks follow-up questions
11. Discussion continues in comments
12. Trader marks review as helpful
13. Mentor rating updated

### Example 2: Mentor Shares Playbook

1. Mentor creates winning playbook
2. Clicks "Share with Students"
3. Chooses: All students / Specific students / Public
4. Adds sharing message
5. **Students receive notification**
6. Students can copy playbook to their account
7. Students can view example trades using playbook
8. Analytics track playbook performance across students

### Example 3: Admin Approves Mentor

1. User applies to become mentor
2. Fills mentor application form
3. **Admin receives notification**
4. Admin reviews application
5. Admin checks trading performance
6. Admin approves/rejects with feedback
7. **Applicant receives notification**
8. If approved, mentor dashboard unlocked
9. System creates mentor profile
10. Mentor appears in mentor directory

---

## 🎨 Design Guidelines

### Color Coding
- **Admin actions**: Red/Orange (high privilege)
- **Mentor features**: Blue/Purple (educational)
- **Reviews**: Green (positive) / Yellow (neutral) / Red (needs work)
- **Notifications**: Badge with count

### UI Principles
- **Clear hierarchy**: Role-specific features clearly separated
- **Contextual actions**: Show relevant actions based on user role
- **Responsive design**: Mobile-first for on-the-go reviews
- **Accessibility**: WCAG 2.1 Level AA compliance
- **Performance**: Lazy load heavy components, infinite scroll

---

## 📝 Next Steps

1. **Review this plan** with you to prioritize features
2. **Create database migrations** for new tables
3. **Update TypeScript types** for new entities
4. **Build admin panel** foundation
5. **Implement role-based permissions**
6. **Develop mentor registration flow**
7. **Create review request system**
8. **Build notification infrastructure**

---

**Ready to start implementation?** Let me know which phase you'd like to begin with, or if you'd like to adjust any features!
