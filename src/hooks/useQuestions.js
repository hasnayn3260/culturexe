import { useState, useEffect } from 'react'
import supabase from '../lib/supabaseClient'

export function useQuestions() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('questions')
          .select('*')
          .order('order_num', { ascending: true })
        if (err) throw err
        setQuestions(data || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  return { questions, loading, error }
}
