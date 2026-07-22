export default function PhotoboothControls({ roomState, onReady, onCountChange, role, disabled }) {
  if (!roomState) return <div className="pb-controls">Connecting to room...</div>;

  const isLocalReady = role === 'caller' ? roomState.callerReady : roomState.calleeReady;
  const isRemoteReady = role === 'caller' ? roomState.calleeReady : roomState.callerReady;

  return (
    <div className="pb-controls">
      <div className="pb-settings">
        <label className="pb-label">
          Photos:
          <select 
            value={roomState.photosCount || 4} 
            onChange={(e) => onCountChange(parseInt(e.target.value))}
            disabled={disabled || isLocalReady}
            className="pb-select"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={6}>6</option>
          </select>
        </label>
      </div>

      <div className="pb-actions">
        <button 
          className={`faerie-btn ${isLocalReady ? 'ready-active' : ''}`}
          onClick={() => onReady(!isLocalReady)}
          disabled={disabled}
        >
          {isLocalReady ? 'Cancel Ready' : 'Ready'}
        </button>
      </div>

      <div className="pb-status">
        <div className={`status-indicator ${isLocalReady ? 'active' : ''}`}>You: {isLocalReady ? 'Ready' : 'Not Ready'}</div>
        <div className={`status-indicator ${isRemoteReady ? 'active' : ''}`}>Partner: {isRemoteReady ? 'Ready' : 'Not Ready'}</div>
      </div>
    </div>
  );
}
