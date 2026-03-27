'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Job } from '@/app/api/jobs/route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/hooks/use-toast'
import { 
  Search, 
  ExternalLink, 
  FileText, 
  File, 
  MapPin, 
  Building2, 
  DollarSign,
  Calendar,
  Briefcase,
  CheckCircle2,
  Clock,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Upload,
  Sparkles,
  Target,
  TrendingUp,
  Rocket,
  PartyPopper,
  Star,
  Heart,
  Zap,
  Award,
  Flame,
  Trophy
} from 'lucide-react'

const statusColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  new: { bg: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20', border: 'border-cyan-300', text: 'text-cyan-700', icon: '💫' },
  applied: { bg: 'bg-gradient-to-r from-emerald-500/20 to-green-500/20', border: 'border-emerald-300', text: 'text-emerald-700', icon: '✅' },
  interviewing: { bg: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20', border: 'border-amber-300', text: 'text-amber-700', icon: '🎯' },
  rejected: { bg: 'bg-gradient-to-r from-rose-500/20 to-pink-500/20', border: 'border-rose-300', text: 'text-rose-700', icon: '💔' },
  offer: { bg: 'bg-gradient-to-r from-purple-500/20 to-violet-500/20', border: 'border-purple-300', text: 'text-purple-700', icon: '🎉' },
}

// Confetti component
function Confetti({ show }: { show: boolean }) {
  const [pieces, setPieces] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([])

  useEffect(() => {
    if (show) {
      const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8E6CF']
      const newPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)]
      }))
      setPieces(newPieces)
      setTimeout(() => setPieces([]), 3000)
    }
  }, [show])

  if (!show || pieces.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(piece => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 animate-confetti"
          style={{
            left: `${piece.left}%`,
            top: '-20px',
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  )
}

export default function JobDashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [salaryRange, setSalaryRange] = useState<[number, number]>([0, 300000])
  const [showFilters, setShowFilters] = useState(true)
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Calculate stats
  const stats = useMemo(() => {
    const total = jobs.length
    const newJobs = jobs.filter(j => j.status === 'new').length
    const applied = jobs.filter(j => j.status === 'applied').length
    const interviewing = jobs.filter(j => j.status === 'interviewing').length
    const offers = jobs.filter(j => j.status === 'offer').length
    const withDocuments = jobs.filter(j => j.resume_storage_path || j.cover_letter_storage_path).length
    return { total, newJobs, applied, interviewing, offers, withDocuments }
  }, [jobs])

  // Fetch jobs data
  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/jobs')
      const data = await response.json()
      setJobs(data.jobs || [])
      
      const maxSalary = Math.max(...(data.jobs || []).map((j: Job) => j.salary_max || 0))
      setSalaryRange([0, Math.max(maxSalary, 300000)])
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
      toast({
        title: '❌ Error',
        description: 'Failed to load job data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  // Handle CSV upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast({
        title: '❌ Invalid file',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/jobs/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        toast({
          title: '🎉 Upload successful!',
          description: 'Your job data has been updated',
        })
        await fetchJobs()
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      toast({
        title: '❌ Upload failed',
        description: 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  // Get unique values for filters
  const uniqueCompanies = useMemo(() => {
    const companies = [...new Set(jobs.map(j => j.company).filter(Boolean))]
    return companies.sort()
  }, [jobs])

  const uniqueLocations = useMemo(() => {
    const locations = [...new Set(jobs.map(j => j.location).filter(Boolean))]
    return locations.sort()
  }, [jobs])

  const uniqueStatuses = useMemo(() => {
    return [...new Set(jobs.map(j => j.status).filter(Boolean))]
  }, [jobs])

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          job.title?.toLowerCase().includes(query) ||
          job.company?.toLowerCase().includes(query) ||
          job.description?.toLowerCase().includes(query) ||
          job.location?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      if (statusFilter !== 'all' && job.status !== statusFilter) return false
      if (companyFilter !== 'all' && job.company !== companyFilter) return false
      if (locationFilter !== 'all' && job.location !== locationFilter) return false

      const jobMinSalary = job.salary_min || 0
      const jobMaxSalary = job.salary_max || 0
      if (jobMaxSalary > 0 && jobMaxSalary < salaryRange[0]) return false
      if (jobMinSalary > 0 && jobMinSalary > salaryRange[1]) return false

      return true
    })
  }, [jobs, searchQuery, statusFilter, companyFilter, locationFilter, salaryRange])

  // Handle apply action
  const handleApply = async (job: Job) => {
    const applyUrl = job.apply_url || job.job_url
    if (!applyUrl) return

    setApplyingJobId(job.id)
    
    // Open the apply URL
    window.open(applyUrl, '_blank')
    
    // Update status to applied
    try {
      const response = await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: job.id,
          status: 'applied',
          applied_at: new Date().toISOString(),
        }),
      })
      
      if (response.ok) {
        setJobs(prev => prev.map(j => 
          j.id === job.id 
            ? { ...j, status: 'applied', applied_at: new Date().toISOString() }
            : j
        ))
        
        // Trigger confetti!
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 100)
        
        toast({
          title: '🎉 Awesome! You applied!',
          description: `"${job.title}" marked as applied. Good luck! 🍀`,
        })
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setApplyingJobId(null)
    }
  }

  // Format salary
  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return '💰 Not specified'
    const formatNum = (n: number) => n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
    if (min && max) return `💰 ${formatNum(min)} - ${formatNum(max)}`
    if (min) return `💰 From ${formatNum(min)}`
    return `💰 Up to ${formatNum(max!)}`
  }

  // Get document URL
  const getResumeUrl = (job: Job) => job.resume_storage_path || job.resume_url || null
  const getCoverLetterUrl = (job: Job) => job.cover_letter_storage_path || job.cover_url || null

  // Progress percentage
  const progressPercent = stats.total > 0 ? Math.round((stats.applied / stats.total) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50">
      <Confetti show={showConfetti} />
      
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-300/30 to-purple-300/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-300/30 to-blue-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-gradient-to-br from-amber-300/30 to-orange-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl blur-md opacity-50 animate-pulse" />
                <div className="relative bg-gradient-to-r from-violet-500 to-fuchsia-500 p-2.5 rounded-xl">
                  <Rocket className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
                  Job Hunt Dashboard
                </h1>
                <p className="text-slate-500 text-sm flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Let&apos;s land your dream job!
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Upload Button */}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button 
                  variant="outline" 
                  className="gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 hover:from-emerald-100 hover:to-teal-100"
                  disabled={uploading}
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4 text-emerald-600" />
                    {uploading ? 'Uploading...' : 'Upload CSV'}
                  </span>
                </Button>
              </label>
              
              {/* Quick Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/80 border-slate-200 focus:border-violet-300 focus:ring-violet-200"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6 relative">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Jobs */}
          <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0 shadow-xl shadow-violet-500/20 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-violet-100 text-sm">Total Jobs</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <div className="bg-white/20 p-2 rounded-xl">
                  <Briefcase className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ready to Apply */}
          <Card className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white border-0 shadow-xl shadow-cyan-500/20 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-sm">Ready to Apply</p>
                  <p className="text-3xl font-bold">{stats.newJobs}</p>
                </div>
                <div className="bg-white/20 p-2 rounded-xl">
                  <Target className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applied */}
          <Card className="bg-gradient-to-br from-emerald-500 to-green-500 text-white border-0 shadow-xl shadow-emerald-500/20 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Applied</p>
                  <p className="text-3xl font-bold">{stats.applied}</p>
                </div>
                <div className="bg-white/20 p-2 rounded-xl">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* With Documents */}
          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-xl shadow-amber-500/20 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">With Docs</p>
                  <p className="text-3xl font-bold">{stats.withDocuments}</p>
                </div>
                <div className="bg-white/20 p-2 rounded-xl">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Section */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-500" />
                Application Progress
              </span>
              <span className="text-sm font-bold text-violet-600">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-3 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:via-fuchsia-500 [&>div]:to-pink-500" />
            <p className="text-xs text-slate-500 mt-2">
              {stats.applied} of {stats.total} jobs applied • Keep going! 🚀
            </p>
          </CardContent>
        </Card>

        {/* Filters Section */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-white/20">
          <CardHeader className="pb-3">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowFilters(!showFilters)}
            >
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 p-1.5 rounded-lg">
                  <Filter className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg">Filters</CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="hover:bg-violet-50">
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          
          {showFilters && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-white border-slate-200 focus:border-violet-300">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🌈 All statuses</SelectItem>
                      {uniqueStatuses.map(status => (
                        <SelectItem key={status} value={status}>
                          <span>{statusColors[status]?.icon || '📋'} {status}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Company Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Company</label>
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="bg-white border-slate-200 focus:border-violet-300">
                      <SelectValue placeholder="All companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🏢 All companies</SelectItem>
                      {uniqueCompanies.slice(0, 50).map(company => (
                        <SelectItem key={company} value={company}>
                          {company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Location</label>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="bg-white border-slate-200 focus:border-violet-300">
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">📍 All locations</SelectItem>
                      {uniqueLocations.slice(0, 50).map(location => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Salary Range Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Salary: ${salaryRange[0] / 1000}k - ${salaryRange[1] / 1000}k
                  </label>
                  <Slider
                    value={salaryRange}
                    onValueChange={(v) => setSalaryRange(v as [number, number])}
                    max={300000}
                    min={0}
                    step={10000}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                    setCompanyFilter('all')
                    setLocationFilter('all')
                    setSalaryRange([0, 300000])
                  }}
                  className="hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Job Cards */}
        <div className="grid gap-4">
          {filteredJobs.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-white/20">
              <CardContent className="py-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-slate-600">No jobs found</h3>
                <p className="text-slate-400 mt-1">Try adjusting your filters</p>
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job, index) => {
              const hasResume = !!getResumeUrl(job)
              const hasCover = !!getCoverLetterUrl(job)
              const isNew = job.status === 'new'
              
              return (
                <Card 
                  key={job.id} 
                  className={`bg-white/80 backdrop-blur-sm shadow-lg border-white/20 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] ${
                    expandedJob === job.id ? 'ring-2 ring-violet-400 ring-offset-2' : ''
                  } ${isNew ? 'border-l-4 border-l-cyan-400' : ''}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      {/* Status Icon */}
                      <div className={`hidden lg:flex w-12 h-12 rounded-xl items-center justify-center text-2xl ${
                        statusColors[job.status]?.bg || 'bg-slate-100'
                      }`}>
                        {statusColors[job.status]?.icon || '📋'}
                      </div>
                      
                      {/* Job Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {job.title}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className={`${statusColors[job.status]?.bg || ''} ${statusColors[job.status]?.border || ''} ${statusColors[job.status]?.text || ''}`}
                          >
                            {statusColors[job.status]?.icon || '📋'} {job.status}
                          </Badge>
                          {isNew && (
                            <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 animate-pulse">
                              <Zap className="h-3 w-3 mr-1" /> NEW
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 mb-3">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4 text-violet-500" />
                            <span className="font-medium">{job.company || job.firm_name || 'Unknown'}</span>
                          </span>
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-rose-500" />
                              {job.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            {formatSalary(job.salary_min, job.salary_max)}
                          </span>
                          {job.date_found && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-amber-500" />
                              {new Date(job.date_found).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {job.description && (
                          <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                            {job.description}
                          </p>
                        )}

                        {/* Document Badges */}
                        <div className="flex flex-wrap gap-2">
                          {job.source && (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                              via {job.source}
                            </Badge>
                          )}
                          {hasResume && (
                            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0">
                              <FileText className="h-3 w-3 mr-1" /> Resume Ready
                            </Badge>
                          )}
                          {hasCover && (
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                              <File className="h-3 w-3 mr-1" /> Cover Ready
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap lg:flex-col gap-2 lg:ml-4 lg:min-w-[140px]">
                        {/* Apply Button */}
                        <Button
                          className={`flex-1 lg:flex-none gap-2 font-semibold transition-all duration-300 ${
                            job.status === 'applied' 
                              ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600'
                              : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 hover:from-violet-600 hover:via-fuchsia-600 hover:to-pink-600'
                          } text-white shadow-lg hover:shadow-xl`}
                          onClick={() => handleApply(job)}
                          disabled={!job.apply_url && !job.job_url || applyingJobId === job.id}
                        >
                          {applyingJobId === job.id ? (
                            <>
                              <Sparkles className="h-4 w-4 animate-spin" />
                              Opening...
                            </>
                          ) : job.status === 'applied' ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Applied ✓
                            </>
                          ) : (
                            <>
                              <Rocket className="h-4 w-4" />
                              Apply Now!
                            </>
                          )}
                        </Button>
                        
                        {/* Documents Row */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`flex-1 gap-1 ${hasResume ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-50' : 'opacity-50'}`}
                            onClick={() => hasResume && window.open(getResumeUrl(job)!, '_blank')}
                            disabled={!hasResume}
                          >
                            <FileText className="h-4 w-4" />
                            Resume
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className={`flex-1 gap-1 ${hasCover ? 'border-amber-300 text-amber-600 hover:bg-amber-50' : 'opacity-50'}`}
                            onClick={() => hasCover && window.open(getCoverLetterUrl(job)!, '_blank')}
                            disabled={!hasCover}
                          >
                            <File className="h-4 w-4" />
                            Cover
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full lg:w-auto text-slate-500 hover:text-violet-600"
                          onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                        >
                          {expandedJob === job.id ? (
                            <>Less <ChevronUp className="h-4 w-4 ml-1" /></>
                          ) : (
                            <>More <ChevronDown className="h-4 w-4 ml-1" /></>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedJob === job.id && (
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 animate-in fade-in-0 duration-200">
                        {job.description && (
                          <div>
                            <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-amber-500" />
                              Job Description
                            </h4>
                            <p className="text-sm text-slate-600 whitespace-pre-line bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-xl">
                              {job.description}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <span className="text-slate-500 text-xs">Job ID</span>
                            <p className="font-mono text-xs text-slate-700 truncate">{job.id}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <span className="text-slate-500 text-xs">Source</span>
                            <p className="text-slate-700">{job.source || 'N/A'}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <span className="text-slate-500 text-xs">Applied At</span>
                            <p className="text-slate-700">
                              {job.applied_at ? new Date(job.applied_at).toLocaleDateString() : 'Not yet'}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <span className="text-slate-500 text-xs">Department</span>
                            <p className="text-slate-700">{job.department || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-white/20 mt-auto py-4">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
            <Heart className="h-4 w-4 text-rose-500 animate-pulse" />
            Job Hunt Dashboard • {jobs.length} jobs loaded
            <Trophy className="h-4 w-4 text-amber-500" />
          </p>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
