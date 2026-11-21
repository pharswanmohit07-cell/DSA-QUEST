import type { CampaignTopicId } from './questTypes'
import type { RelicReward } from './relicInventory'
import type { RelicRewardClaimDetail } from './relicRewardEvents'
import fireScrollImage from '../../assets/items/relics/ScrollFire.png'
import iceScrollImage from '../../assets/items/relics/ScrollIce.png'
import plantScrollImage from '../../assets/items/relics/ScrollPlant.png'
import rockScrollImage from '../../assets/items/relics/ScrollRock.png'
import thunderScrollImage from '../../assets/items/relics/ScrollThunder.png'
import goldKeyImage from '../../assets/items/relics/GoldKey.png'
import silverKeyImage from '../../assets/items/relics/SilverKey.png'
import './emptyScrollReward.css'

const REWARD_IMAGES: Record<RelicReward, string> = {
  'fire-scroll': fireScrollImage,
  'ice-scroll': iceScrollImage,
  'plant-scroll': plantScrollImage,
  'rock-scroll': rockScrollImage,
  'thunder-scroll': thunderScrollImage,
  'gold-key': goldKeyImage,
  'silver-key': silverKeyImage,
}

const REWARD_LABELS: Record<RelicReward, string> = {
  'fire-scroll': 'Fire Scroll',
  'ice-scroll': 'Ice Scroll',
  'plant-scroll': 'Plant Scroll',
  'rock-scroll': 'Rock Scroll',
  'thunder-scroll': 'Thunder Scroll',
  'gold-key': 'Gold Key',
  'silver-key': 'Silver Key',
}

const GUARDIAN_NAMES: Record<CampaignTopicId, string> = {
  arrays: 'Village Guide',
  'stack-operations': 'Samurai',
  queues: 'Farmer',
  'linked-lists': 'Monk',
  searching: 'Merchant',
  sorting: 'Red Ninja',
  trees: 'Shaman',
}

const NEXT_GUARDIAN: Record<CampaignTopicId, { name: string; location: string }> = {
  arrays: { name: 'Samurai', location: 'the eastern dojo' },
  'stack-operations': { name: 'Farmer', location: 'the central plaza' },
  queues: { name: 'Monk', location: 'the western yard' },
  'linked-lists': { name: 'Merchant', location: 'the central plaza' },
  searching: { name: 'Red Ninja', location: 'the eastern field' },
  sorting: { name: 'Shaman', location: 'the northern shrine' },
  trees: { name: 'Old Man', location: 'near the village gate' },
}

export function RelicRewardReveal({
  detail,
  onContinue,
}: {
  detail: RelicRewardClaimDetail
  onContinue: () => void
}) {
  const rewardName = REWARD_LABELS[detail.reward]
  const isScroll = detail.reward.endsWith('-scroll')
  const nextGuardian = NEXT_GUARDIAN[detail.guardian]
  const isFinalGuardian = detail.guardian === 'trees'

  return (
    <div
      className="empty-scroll-reward-overlay"
      data-testid="relic-reward"
      role="dialog"
      aria-modal="true"
      aria-labelledby="relic-reward-title"
      onKeyDownCapture={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter' || event.key === ' ') {
          if (event.target === event.currentTarget) {
            event.preventDefault()
            onContinue()
          }
        }
      }}
    >
      <section className="empty-scroll-reward-card">
        <p className="empty-scroll-reward-eyebrow">
          {isScroll ? 'Guardian knowledge recorded' : 'Guardian treasure recovered'}
        </p>
        <h2 id="relic-reward-title">{rewardName.toUpperCase()} OBTAINED</h2>
        <div className="empty-scroll-reward-stage" aria-hidden="true">
          <span className="empty-scroll-reward-aura" />
          <span className="empty-scroll-reward-ring" />
          <img className="empty-scroll-reward-art" src={REWARD_IMAGES[detail.reward]} alt="" draggable={false} />
        </div>
        <p className="empty-scroll-reward-copy">
          {isScroll
            ? GUARDIAN_NAMES[detail.guardian] + ' has inscribed your empty scroll with protected knowledge.'
            : 'The guardian has entrusted you with the ' + rewardName + '.'}
        </p>
        <p className="empty-scroll-reward-copy">
          <strong>{isFinalGuardian ? 'Next step: return to the Old Man' : 'Next guardian: ' + nextGuardian.name}</strong>
          <br />
          {isFinalGuardian
            ? 'Bring the recovered relics to him near the village gate.'
            : 'Continue your journey to ' + nextGuardian.location + '.'}
        </p>
        <button type="button" className="empty-scroll-reward-continue" onClick={onContinue} autoFocus>
          Continue
        </button>
      </section>
    </div>
  )
}
