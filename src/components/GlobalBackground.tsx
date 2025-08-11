import React from 'react'

const GlobalBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-theme-dark" />
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-theme-purple/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 -right-32 w-80 h-80 bg-theme-blue/20 rounded-full blur-3xl" />
    </div>
  )
}

export default GlobalBackground
