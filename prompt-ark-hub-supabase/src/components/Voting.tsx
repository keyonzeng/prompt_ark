interface VotingProps {
  upvotes: number
  downvotes: number
  onVote: (type: 'up' | 'down') => void
}

export function Voting({ upvotes, downvotes, onVote }: VotingProps) {
  return (
    <div className="hub-modal-votes">
      <button 
        className="hub-vote-btn up"
        onClick={() => onVote('up')}
      >
        👍 <span>{upvotes}</span>
      </button>
      <button 
        className="hub-vote-btn down"
        onClick={() => onVote('down')}
      >
        👎 <span>{downvotes}</span>
      </button>
    </div>
  )
}
