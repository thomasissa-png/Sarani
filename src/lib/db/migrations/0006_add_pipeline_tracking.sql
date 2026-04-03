-- Migration 0006: Add pipeline tracking columns to case_study_candidates
-- Supports the multi-agent pipeline (creative-strategy → copywriter → social)

ALTER TABLE case_study_candidates ADD COLUMN IF NOT EXISTS pipeline_status varchar(20) DEFAULT 'idle';
-- pipeline_status: idle | step_1_creative | step_2_copywriter | step_3_social | complete | failed

ALTER TABLE case_study_candidates ADD COLUMN IF NOT EXISTS pipeline_steps jsonb DEFAULT '[]';
-- pipeline_steps: [{step: 1, agent: "creative-strategy", output: {...}, completedAt: "..."}]

ALTER TABLE case_study_candidates ADD COLUMN IF NOT EXISTS visual_suggestions jsonb DEFAULT '[]';
-- visual_suggestions: [{url: "...", name: "...", thumbnailUrl: "...", selected: false}]
