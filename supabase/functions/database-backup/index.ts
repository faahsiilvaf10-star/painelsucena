import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting database backup...')

    // 1. Get all public tables
    const { data: tables, error: tablesError } = await supabaseAdmin
      .rpc('get_tables_info') // We might need a helper function or raw SQL

    // If RPC doesn't exist, we can try to query information_schema directly if permissions allow
    // but usually it's better to have an RPC or just a list of tables.
    // Let's use a simpler approach: query the list of tables via SQL
    
    const { data: tablesList, error: listError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    if (listError) {
      // If we can't query information_schema directly (permission issue), 
      // we might need a stored procedure.
      console.error('Error listing tables:', listError)
      throw listError
    }

    const backupData: Record<string, any> = {}
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const folderName = `backup-${timestamp}`

    console.log(`Found ${tablesList.length} tables to backup.`)

    for (const table of tablesList) {
      const tableName = table.table_name
      console.log(`Backing up table: ${tableName}`)
      
      const { data, error } = await supabaseAdmin
        .from(tableName)
        .select('*')

      if (error) {
        console.warn(`Could not backup table ${tableName}:`, error.message)
        backupData[tableName] = { error: error.message }
      } else {
        backupData[tableName] = data
      }
    }

    // 2. Upload the full backup as a single JSON file
    const fileName = `${folderName}/full_backup.json`
    const fileContent = JSON.stringify(backupData, null, 2)
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from('database-backups')
      .upload(fileName, fileContent, {
        contentType: 'application/json',
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading backup:', uploadError)
      throw uploadError
    }

    console.log(`Backup completed successfully: ${fileName}`)

    return new Response(
      JSON.stringify({ 
        message: 'Backup completed successfully', 
        file: fileName,
        tablesCount: tablesList.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Backup failed:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
