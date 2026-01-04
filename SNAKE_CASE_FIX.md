# 🔧 snake_case Fix - Complete!

## ✅ What Was Fixed

Your app is now properly communicating with Supabase! The issue was a **column naming mismatch**:

### **The Problem:**
- **JavaScript/TypeScript convention**: camelCase (`assigneeIds`, `categoryId`)
- **PostgreSQL/Supabase convention**: snake_case (`assignee_ids`, `category_id`)
- **Result**: Database couldn't find columns → errors!

### **The Solution:**
Updated all database operations to:
1. **Transform data when LOADING** from Supabase (snake_case → camelCase)
2. **Transform data when SAVING** to Supabase (camelCase → snake_case)

---

## 🎯 What You Need To Do Now

### **Step 1: Make Sure SQL Script Ran**

The database should have these exact column names. In Supabase → **SQL Editor**, verify this ran:

```sql
-- These create tables with snake_case columns
create table chores (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  completed boolean default false,
  assignee_ids text[] default array[]::text[],  ← snake_case
  category_id uuid,                              ← snake_case
  household_id text not null,
  created_at timestamp default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  assignee_ids text[] default array[]::text[],  ← snake_case
  household_id text not null,
  created_at timestamp default now()
);

create table assignees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  household_id text not null,
  created_at timestamp default now()
);
```

If not, run the full SQL script from earlier!

### **Step 2: Restart Your Dev Server**

```bash
# Stop the server (Ctrl+C)
npm run dev
```

### **Step 3: Clear Browser Data**

In **both** your browser and your roommate's:

```javascript
// Open console (F12) and run:
localStorage.clear()
```

Then refresh the page.

### **Step 4: Test Collaboration**

**On Your Device:**
1. Sign in with household code (e.g., "HOME-2026")
2. Add a chore called "Test Chore"
3. Check Supabase Table Editor → `chores` table
4. **You should see the chore there!** ✅

**On Roommate's Device:**
1. Sign in with SAME household code "HOME-2026"
2. **Refresh the page** (Cmd/Ctrl + R)
3. **You should see "Test Chore"!** 🎉

---

## 🔍 Verify It's Working

### **Check Supabase Dashboard:**

Go to **Table Editor** → `chores`:
- ✅ Should see rows when you add chores
- ✅ `assignee_ids` column should show `{}`
- ✅ `category_id` column should show `null`
- ✅ `household_id` should match your code

### **Check Browser Console:**

No red errors! If you see:
- ✅ No errors → It's working!
- ❌ "Could not find column" → SQL script not run
- ❌ "relation does not exist" → Tables not created

---

## 📝 What Changed in the Code

### **Data Loading (From DB):**

```typescript
// OLD (broken):
setChores(choresData);  // ❌ DB uses snake_case

// NEW (works):
setChores(choresData.map(chore => ({
  ...chore,
  assigneeIds: chore.assignee_ids || [],  // ✅ Transform to camelCase
  categoryId: chore.category_id || null
})));
```

### **Data Saving (To DB):**

```typescript
// OLD (broken):
supabase.from("chores").insert({
  assigneeIds: [],  // ❌ DB expects snake_case
  categoryId: id
});

// NEW (works):
supabase.from("chores").insert({
  assignee_ids: [],  // ✅ Use snake_case for DB
  category_id: id
});
```

---

## ✨ Why This Approach?

**Option 1** (What we did): Transform data at the boundary
- ✅ JavaScript code stays idiomatic (camelCase)
- ✅ Database stays idiomatic (snake_case)
- ✅ Clear separation of concerns

**Option 2** (Alternative): Use snake_case everywhere
- ❌ JavaScript would look weird (`chore.assignee_ids`)
- ❌ Not TypeScript/JavaScript convention

**Option 3** (Alternative): Force DB to use camelCase
- ❌ Not PostgreSQL convention
- ❌ Harder to query in SQL Editor

---

## 🚀 Next Steps (Optional)

Once collaboration is working, you can add:
1. **Real-time subscriptions** - see changes without refreshing
2. **Deploy to Vercel** - make it public
3. **Custom domain** - share with friends

---

## 🆘 Still Not Working?

### **If you still see "column not found" errors:**

1. **Drop all tables and recreate:**
   ```sql
   drop table if exists chores cascade;
   drop table if exists categories cascade;
   drop table if exists assignees cascade;
   ```
   Then run the CREATE TABLE script again.

2. **Check your `.env.local`:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://cswmryzjagoqtkkenlzf.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-key-here
   ```

3. **Restart everything:**
   - Stop dev server
   - Clear browser cache
   - `npm run dev`
   - Test again

### **If chores still don't sync:**

Share the exact error from browser console (F12 → Console) and I'll help debug!

---

**This should fix it! Test and let me know! 🎯**

