-- Expand canonical deficits so the current 9-domain SkillCascade assessment
-- can map into the BCBA-super-assistant ontology without losing major clinical
-- areas while the canonical goal library is rebuilt.

INSERT INTO canonical_deficits (domain_id, slug, name, description, medical_necessity_summary, display_order)
SELECT d.id, x.slug, x.name, x.description, x.medical_necessity_summary, x.display_order
FROM canonical_domains d
JOIN (
  VALUES
    ('communication', 'help_seeking_self_advocacy', 'Help-Seeking and Self-Advocacy', 'Difficulty appropriately requesting help, clarification, accommodation, or support across settings.', 'Help-seeking deficits can impair treatment access, safety, and functional communication across daily routines.', 40),
    ('communication', 'expressive_problem_explanation', 'Expressive Problem Explanation', 'Difficulty clearly describing a problem, what happened, or what support is needed.', 'Problem-explanation deficits interfere with access to support, clinical communication, and functional participation.', 50),
    ('communication', 'communication_repair', 'Communication Repair', 'Difficulty recognizing and repairing communication breakdowns with another person.', 'Communication repair deficits increase frustration and reduce successful communication across settings.', 60),

    ('social', 'shared_attention_social_orientation', 'Shared Attention and Social Orientation', 'Difficulty orienting to social partners, shared attention cues, or socially relevant information.', 'Shared-attention deficits reduce access to social learning, communication growth, and natural-environment teaching.', 60),
    ('social', 'social_norms_context', 'Social Norms and Context', 'Difficulty understanding or responding to context-dependent social expectations, rules, and boundaries.', 'Social-norm deficits reduce adaptive participation in home, school, and community settings.', 70),
    ('social', 'turn_taking_reciprocity', 'Turn-Taking and Reciprocity', 'Difficulty engaging in reciprocal exchanges, turn-taking, or shared participation with others.', 'Reciprocity deficits impair peer interaction, relationship building, and socially significant participation.', 80),
    ('social', 'repair_and_conflict_navigation', 'Repair and Conflict Navigation', 'Difficulty identifying social ruptures and using adaptive repair or conflict-navigation responses.', 'Repair deficits increase relationship disruption, social isolation, and conflict-driven behavior risk.', 90),

    ('adaptive_daily_living', 'safety_awareness_emergency_response', 'Safety Awareness and Emergency Response', 'Difficulty recognizing danger, following safety directives, or responding effectively in emergencies.', 'Safety-response deficits directly affect personal safety, community access, and caregiver burden.', 50),

    ('coping_self_regulation', 'emotion_identification_awareness', 'Emotion Identification and Internal Awareness', 'Difficulty noticing, labeling, or using internal-state information to support adaptive responding.', 'Internal-awareness deficits reduce self-regulation and can increase dysregulation and behavior risk.', 40),
    ('coping_self_regulation', 'trigger_awareness_self_insight', 'Trigger Awareness and Self-Insight', 'Difficulty identifying triggers, early warning signs, or contextual variables that affect behavior and performance.', 'Trigger-awareness deficits impair prevention, coping, and generalization of treatment gains.', 50),
    ('coping_self_regulation', 'executive_initiation_persistence', 'Executive Initiation and Persistence', 'Difficulty initiating, persisting with, or re-engaging in tasks without excessive support.', 'Initiation and persistence deficits reduce learning access, independence, and treatment participation.', 60),
    ('coping_self_regulation', 'executive_planning_self_monitoring', 'Executive Planning and Self-Monitoring', 'Difficulty planning, monitoring, or adjusting behavior during functional tasks and routines.', 'Planning and self-monitoring deficits interfere with independence and generalization across settings.', 70),
    ('coping_self_regulation', 'problem_solving_judgment', 'Problem Solving and Judgment', 'Difficulty identifying problems, evaluating options, or selecting safe and adaptive responses.', 'Problem-solving and judgment deficits affect safety, independence, and functional community participation.', 80),
    ('coping_self_regulation', 'self_concept_resilience', 'Self-Concept and Resilience', 'Difficulty recovering from mistakes, tolerating uncertainty, or maintaining adaptive engagement after setbacks.', 'Resilience deficits reduce treatment access, social participation, and persistence in skill acquisition.', 90),
    ('coping_self_regulation', 'support_utilization_help_acceptance', 'Support Utilization and Help Acceptance', 'Difficulty responding to prompts, co-regulation, models, or assistance in a way that supports learning and participation.', 'Support-utilization deficits reduce the client''s ability to benefit from intervention and generalize supports across settings.', 100)
) AS x(domain_slug, slug, name, description, medical_necessity_summary, display_order)
  ON d.slug = x.domain_slug
ON CONFLICT (domain_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    medical_necessity_summary = EXCLUDED.medical_necessity_summary,
    display_order = EXCLUDED.display_order;
