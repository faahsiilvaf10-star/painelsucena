import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OvertimeRecord {
  id: string;
  user_id: string;
  user_name: string;
  cargo: string;
  record_date: string;
  entry_time: string;
  exit_time: string;
  is_overtime: boolean;
}

// Calculate hours between two time strings (HH:MM:SS format)
function calculateHours(entryTime: string, exitTime: string): number {
  const [entryHours, entryMinutes] = entryTime.split(":").map(Number);
  const [exitHours, exitMinutes] = exitTime.split(":").map(Number);

  const entryTotalMinutes = entryHours * 60 + entryMinutes;
  const exitTotalMinutes = exitHours * 60 + exitMinutes;

  // Handle case where exit is past midnight (shouldn't happen often)
  let diffMinutes = exitTotalMinutes - entryTotalMinutes;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
  }

  return diffMinutes / 60;
}

// Get day of week from date string (0 = Sunday, 6 = Saturday)
function getDayOfWeek(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00");
  return date.getDay();
}

// Calculate overtime hours for a record
function calculateOvertimeHours(record: OvertimeRecord): number {
  if (!record.is_overtime) return 0;

  const dayOfWeek = getDayOfWeek(record.record_date);
  const [exitHours, exitMinutes] = record.exit_time.split(":").map(Number);
  const exitTotalMinutes = exitHours * 60 + exitMinutes;

  // Weekend - all hours are overtime
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return calculateHours(record.entry_time, record.exit_time);
  }

  // Friday - overtime after 16:00
  if (dayOfWeek === 5) {
    const thresholdMinutes = 16 * 60;
    if (exitTotalMinutes > thresholdMinutes) {
      return (exitTotalMinutes - thresholdMinutes) / 60;
    }
    return 0;
  }

  // Monday to Thursday - overtime after 17:00
  const thresholdMinutes = 17 * 60;
  if (exitTotalMinutes > thresholdMinutes) {
    return (exitTotalMinutes - thresholdMinutes) / 60;
  }
  return 0;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate period: day 21 of previous month to day 20 of current month
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let periodStart: Date;
    let periodEnd: Date;

    if (currentDay >= 20) {
      // We're on or after day 20, so calculate for current period
      // Period: 21 of previous month to 20 of current month
      if (currentMonth === 0) {
        // January - previous month is December of previous year
        periodStart = new Date(currentYear - 1, 11, 21);
      } else {
        periodStart = new Date(currentYear, currentMonth - 1, 21);
      }
      periodEnd = new Date(currentYear, currentMonth, 20);
    } else {
      // We're before day 20, calculate for previous period
      if (currentMonth === 0) {
        // January
        periodStart = new Date(currentYear - 1, 10, 21); // Nov 21
        periodEnd = new Date(currentYear - 1, 11, 20); // Dec 20
      } else if (currentMonth === 1) {
        // February
        periodStart = new Date(currentYear - 1, 11, 21); // Dec 21
        periodEnd = new Date(currentYear, 0, 20); // Jan 20
      } else {
        periodStart = new Date(currentYear, currentMonth - 2, 21);
        periodEnd = new Date(currentYear, currentMonth - 1, 20);
      }
    }

    const periodStartStr = periodStart.toISOString().split("T")[0];
    const periodEndStr = periodEnd.toISOString().split("T")[0];

    console.log(`Calculating overtime summary for period: ${periodStartStr} to ${periodEndStr}`);

    // Fetch all overtime records for the period
    const { data: records, error: recordsError } = await supabase
      .from("overtime_records")
      .select("*")
      .gte("record_date", periodStartStr)
      .lte("record_date", periodEndStr);

    if (recordsError) {
      console.error("Error fetching records:", recordsError);
      throw recordsError;
    }

    console.log(`Found ${records?.length || 0} records for the period`);

    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No records found for this period",
          period: { start: periodStartStr, end: periodEndStr },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group records by user
    const userRecords: Record<string, OvertimeRecord[]> = {};
    for (const record of records) {
      if (!userRecords[record.user_id]) {
        userRecords[record.user_id] = [];
      }
      userRecords[record.user_id].push(record);
    }

    // Calculate summaries for each user
    const summaries = [];
    for (const [userId, userRecs] of Object.entries(userRecords)) {
      const firstRecord = userRecs[0];
      let totalHoursWorked = 0;
      let totalOvertimeHours = 0;
      let totalOvertimeRecords = 0;

      for (const record of userRecs) {
        const hoursWorked = calculateHours(record.entry_time, record.exit_time);
        totalHoursWorked += hoursWorked;

        if (record.is_overtime) {
          totalOvertimeRecords++;
          totalOvertimeHours += calculateOvertimeHours(record);
        }
      }

      summaries.push({
        user_id: userId,
        user_name: firstRecord.user_name,
        cargo: firstRecord.cargo,
        period_start: periodStartStr,
        period_end: periodEndStr,
        total_records: userRecs.length,
        total_overtime_records: totalOvertimeRecords,
        total_hours_worked: Math.round(totalHoursWorked * 100) / 100,
        total_overtime_hours: Math.round(totalOvertimeHours * 100) / 100,
      });
    }

    console.log(`Generated ${summaries.length} summaries`);

    // Upsert summaries
    for (const summary of summaries) {
      const { error: upsertError } = await supabase
        .from("overtime_summaries")
        .upsert(summary, {
          onConflict: "user_id,period_start,period_end",
        });

      if (upsertError) {
        console.error(`Error upserting summary for user ${summary.user_id}:`, upsertError);
      }
    }

    console.log("Summaries saved successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Calculated ${summaries.length} overtime summaries`,
        period: { start: periodStartStr, end: periodEndStr },
        summaries,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in calculate-overtime-summary:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
