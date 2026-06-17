import { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabaseClient'

export function useAssessments() {
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('assessment_stats')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) throw err
      setAssessments(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function createAssessment(assessment) {
    const { error: err } = await supabase
      .from('assessments')
      .insert(assessment)
    if (err) throw err
    await fetch()
  }

  async function updateAssessment(id, updates) {
    const { error: err } = await supabase
      .from('assessments')
      .update(updates)
      .eq('id', id)
    if (err) throw err
    await fetch()
  }

  async function getAssessmentById(id) {
    const { data, error: err } = await supabase
      .from('assessment_stats')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (err) throw err
    return data
  }

  return { assessments, loading, error, createAssessment, updateAssessment, getAssessmentById, refetch: fetch }
}
