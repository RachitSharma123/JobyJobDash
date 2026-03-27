import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read the file content
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const csvContent = buffer.toString('utf-8')
    
    // Validate it's a valid CSV (has headers)
    const lines = csvContent.split('\n')
    if (lines.length < 2) {
      return NextResponse.json({ error: 'Invalid CSV file' }, { status: 400 })
    }

    // Check for expected headers
    const headers = lines[0].toLowerCase()
    if (!headers.includes('title') || !headers.includes('company')) {
      return NextResponse.json({ error: 'CSV must have title and company columns' }, { status: 400 })
    }

    // Save the file
    const csvPath = path.join(process.cwd(), 'upload', 'job_applications_rows.csv')
    
    // Create backup of existing file
    if (fs.existsSync(csvPath)) {
      const backupPath = path.join(process.cwd(), 'upload', `job_applications_backup_${Date.now()}.csv`)
      fs.copyFileSync(csvPath, backupPath)
    }
    
    fs.writeFileSync(csvPath, csvContent, 'utf-8')
    
    // Count jobs
    const jobCount = lines.length - 1 // Subtract header row
    
    return NextResponse.json({ 
      success: true, 
      message: `Uploaded ${jobCount} jobs`,
      jobCount 
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
