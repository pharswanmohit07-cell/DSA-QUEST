import { useEffect, useRef, useState } from 'react'
import { useQuestState } from './QuestManager'
import type { QuestRecord } from './questTypes'
import { ARRAYS_CAMPAIGN_STAGE_EVENT, getArraysCampaignStage } from './arraysCampaignStages'
import { hasKnowledgeScroll } from './knowledgeScrolls'
import { QuestHudTutorial } from './QuestHudTutorial'
import './questTracker.css'

const UNREAD_QUEST_STORAGE_KEY = 'dsa-quest-unread-v1'

const QUEST_NEW_GLOW_CSS = `
.quest-tracker-toggle.has-new-quest {
  position: relative;
  animation: quest-new-quest-pulse 1.2s ease-in-out infinite;
}
.quest-tracker-toggle.has-new-quest::after {
  content: '';
  position: absolute;
  top: -3px;
  right: -3px;
  width: 8px;
  height: 8px;
  border: 2px solid #f4e8ce;
  border-radius: 50%;
  background: #d84a2b;
}
@keyframes quest-new-quest-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 2px 0 #54391f, 0 0 5px rgba(245, 158, 11, 0.35);
  }
  50% {
    transform: scale(1.08);
    box-shadow: 0 2px 0 #54391f, 0 0 18px 5px rgba(251, 191, 36, 0.72);
  }
}
@media (prefers-reduced-motion: reduce) {
  .quest-tracker-toggle.has-new-quest {
    animation: none;
    box-shadow: 0 2px 0 #54391f, 0 0 12px 3px rgba(251, 191, 36, 0.62);
  }
}
`

const STATUS_LABEL: Record<QuestRecord['status'], string> = {
  locked: 'Locked',
  active: 'Active',
  completed: 'Done',
  failed: 'Failed',
}

/** Quest details stay hidden behind a compact HUD button until requested. */
export function QuestTracker() ¶»§q«^