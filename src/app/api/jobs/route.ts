import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export interface Job {
  id: string
  external_id: string
  title: string
  company: string
  location: string
  salary_min: number | null
  salary_max: number | null
  apply_url: string
  source: string
  date_found: string
  status: string
  resume_storage_path: string
  cover_letter_storage_path: string
  tailored_resume: string
  cover_letter_content: string
  adzuna_id: string
  description: string
  created_at: string
  updated_at: string
  firm_name: string
  ats_type: string
  ats_job_id: string
  ats_company_id: string
  ats_board_token: string
  department: string
  application_screenshot_path: string
  telegram_message_id: string
  approved_at: string
  applied_at: string
  follow_up_sent: string
  error_log: string
  job_url: string
  resume_url: string
  cover_url: string
}

function parseCSV(csvText: string): Job[] {
  const lines = csvText.split('\n')
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(h => h.trim())
  const jobs: Job[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    
    // Handle CSV parsing with quoted fields
    const values: string[] = []
    let currentValue = ''
    let inQuotes = false
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          currentValue += '"'
          j++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim())
        currentValue = ''
      } else {
        currentValue += char
      }
    }
    values.push(currentValue.trim())
    
    if (values.length >= headers.length) {
      const job: Record<string, string | number | null> = {}
      headers.forEach((header, index) => {
        const value = values[index] || ''
        // Parse numeric fields
        if (header === 'salary_min' || header === 'salary_max') {
          job[header] = value ? parseInt(value, 10) : null
        } else {
          job[header] = value
        }
      })
      jobs.push(job as Job)
    }
  }
  
  return jobs
}

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'upload', 'job_applications_rows.csv')
    const csvText = fs.readFileSync(csvPath, 'utf-8')
    const jobs = parseCSV(csvText)
    
    return NextResponse.json({ jobs, total: jobs.length })
  } catch (error) {
    console.error('Error reading CSV:', error)
    return NextResponse.json({ error: 'Failed to read jobs data' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status, applied_at } = body
    
    const csvPath = path.join(process.cwd(), 'upload', 'job_applications_rows.csv')
    const csvText = fs.readFileSync(csvPath, 'utf-8')
    const lines = csvText.split('\n')
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'No jobs found' }, { status: 404 })
    }
    
    const headers = lines[0].split(',').map(h => h.trim())
    const statusIndex = headers.indexOf('status')
    const appliedAtIndex = headers.indexOf('applied_at')
    const idIndex = headers.indexOf('id')
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) continue
      
      // Check if this is the job to update
      if (line.includes(id)) {
        const values: string[] = []
        let currentValue = ''
        let inQuotes = false
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j]
          
          if (char === '"') {
            if (inQuotes && line[j + 1] === '"') {
              currentValue += '"'
              j++
            } else {
              inQuotes = !inQuotes
            }
          } else if (char === ',' && !inQuotes) {
            values.push(currentValue.trim())
            currentValue = ''
          } else {
            currentValue += char
          }
        }
        values.push(currentValue.trim())
        
        if (values[idIndex] === id) {
          if (statusIndex !== -1 && status) {
            values[statusIndex] = status
          }
          if (appliedAtIndex !== -1 && applied_at) {
            values[appliedAtIndex] = applied_at
          }
          
          // Reconstruct the line
          lines[i] = values.map(v => {
            if (v.includes(',') || v.includes('"') || v.includes('\n')) {
              return `"${v.replace(/"/g, '""')}"`
            }
            return v
          }).join(',')
          break
        }
      }
    }
    
    fs.writeFileSync(csvPath, lines.join('\n'), 'utf-8')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}
