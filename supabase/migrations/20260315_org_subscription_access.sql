-- Allow org members to read subscriptions of users in the same org
-- This enables team members to inherit the org owner's subscription plan
CREATE POLICY "Org members read org subscriptions" ON subscriptions
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM profiles WHERE org_id = get_my_org_id()
    )
  );
