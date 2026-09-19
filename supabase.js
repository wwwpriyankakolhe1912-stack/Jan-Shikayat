
const { data, error } = await supabase
  .from('your_table_name') 
  .insert([
    { text_column: userInputValue } 
  ])
