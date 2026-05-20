import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );

  // Target time = now + 5 minutes (UTC), matched against stored study_reminder_time
  const target = new Date(Date.now() + 5 * 60 * 1000);
  const targetTime = `${String(target.getUTCHours()).padStart(2, '0')}:${String(target.getUTCMinutes()).padStart(2, '0')}`;

  const { data: users } = await supabase
    .from('user_profiles')
    .select('push_subscription, study_reminder_time')
    .eq('study_reminder_enabled', true)
    .eq('study_reminder_time', targetTime)
    .not('push_subscription', 'is', null);

  if (!users || users.length === 0) {
    return new Response('No reminders to send', { status: 200 });
  }

  const results = await Promise.allSettled(
    users.map((user) =>
      webpush.sendNotification(
        user.push_subscription,
        JSON.stringify({
          title: 'Time to practice Slovak! 🐌',
          body: 'Motivation is how you start. But Discipline is how you conquer! 🔥',
          icon: '/icons/icon-192.png',
          url: '/#/',
        }),
      )
    ),
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return new Response(
    JSON.stringify({ sent, failed, targetTime }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
