'use client'

import { type FormEvent, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function InputForm() {
  const [input, setInput] = useState('')
  const supabase = createClient()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const { data, error } = await supabase
      .from('user_inputs') // Replace with your table name
      .insert([{ content: input }])

    if (error) {
      console.error('Error inserting data:', error)
    } else {
      alert('Saved to Supabase!')
      setInput('')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter text..."
      />
      <button type="submit">Submit</button>
    </form>
  )
}