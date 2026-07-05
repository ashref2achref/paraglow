export default function AdminLoading() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '40vh',
      gap: '12px',
    }}>
      <div style={{
        width: '28px',
        height: '28px',
        border: '3px solid #eadfca',
        borderTopColor: '#c9a052',
        borderRadius: '50%',
        animation: 'admin-spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes admin-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
