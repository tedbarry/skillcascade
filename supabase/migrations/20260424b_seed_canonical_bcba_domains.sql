-- Seed initial canonical BCBA domains and deficits
-- Created: 2026-04-24
-- Basis:
--   - local de-identified Vineland corpus review
--   - local de-identified SRS-2 corpus review
--   - BCBA super assistant product direction

WITH inserted_domains AS (
  INSERT INTO canonical_domains (slug, name, description, display_order)
  VALUES
    ('communication', 'Communication', 'Functional communication, receptive/expressive language, and socially effective communication.', 10),
    ('social', 'Social', 'Social understanding, relationships, social participation, and social flexibility.', 20),
    ('adaptive_daily_living', 'Adaptive Daily Living', 'Personal, domestic, community, and independence-related adaptive functioning.', 30),
    ('coping_self_regulation', 'Coping and Self-Regulation', 'Coping skills, flexibility, emotional/behavioral self-management, and adaptive responding.', 40),
    ('caregiver_support', 'Caregiver Support', 'Caregiver implementation, generalization, and training-related goals.', 50)
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        display_order = EXCLUDED.display_order
  RETURNING id, slug
)
INSERT INTO canonical_deficits (domain_id, slug, name, description, medical_necessity_summary, display_order)
SELECT d.id, x.slug, x.name, x.description, x.medical_necessity_summary, x.display_order
FROM inserted_domains d
JOIN (
  VALUES
    ('communication', 'functional_communication_initiation', 'Functional Communication Initiation', 'Difficulty independently initiating requests, comments, or responses using an effective communication mode.', 'Deficits in functional communication can directly impair daily functioning, access to needs, learning, and behavior regulation.', 10),
    ('communication', 'receptive_language_comprehension', 'Receptive Language Comprehension', 'Difficulty understanding verbal directions, questions, concepts, or spoken information needed in daily settings.', 'Receptive deficits interfere with safety, learning, compliance, and functional participation across environments.', 20),
    ('communication', 'social_communication', 'Social Communication', 'Difficulty using communication effectively in social interactions, including conversational reciprocity and context-appropriate responding.', 'Social communication deficits affect peer/adult interaction, participation, and adaptive functioning.', 30),

    ('social', 'social_cognition_perspective_taking', 'Social Cognition and Perspective-Taking', 'Difficulty interpreting social cues, understanding others'' perspectives, and responding appropriately in social contexts.', 'Deficits in social cognition reduce the ability to navigate relationships, routines, and community settings safely and effectively.', 10),
    ('social', 'interpersonal_relationships', 'Interpersonal Relationships', 'Difficulty building, maintaining, or appropriately participating in relationships with peers or adults.', 'Relationship deficits limit school, home, and community participation and can increase isolation or behavior challenges.', 20),
    ('social', 'play_leisure_participation', 'Play and Leisure Participation', 'Difficulty engaging in appropriate, reciprocal, and developmentally useful play or leisure activity.', 'Play and leisure deficits reduce opportunities for social learning, independence, and age-appropriate participation.', 30),
    ('social', 'social_awareness', 'Social Awareness', 'Difficulty noticing and orienting to relevant social information in the environment.', 'Social awareness deficits reduce responsiveness to teaching, peers, caregivers, and community expectations.', 40),
    ('social', 'social_motivation_initiation', 'Social Motivation and Initiation', 'Difficulty seeking out or initiating social interaction in functional ways.', 'Low social initiation can reduce opportunities for communication growth, relationships, and natural-environment learning.', 50),

    ('adaptive_daily_living', 'personal_self_care', 'Personal Self-Care', 'Difficulty performing age-appropriate personal care and self-management tasks independently.', 'Self-care deficits increase dependence on caregivers and reduce adaptive functioning.', 10),
    ('adaptive_daily_living', 'domestic_participation', 'Domestic Participation', 'Difficulty participating in age-appropriate household routines, chores, and home-management tasks.', 'Domestic skill deficits reduce independence and create barriers to functional daily living.', 20),
    ('adaptive_daily_living', 'community_functioning', 'Community Functioning', 'Difficulty safely and effectively functioning in community routines, errands, navigation, or public settings.', 'Community deficits can impair safety, generalization, and participation across natural environments.', 30),
    ('adaptive_daily_living', 'functional_academic_written', 'Functional Academic and Written Skills', 'Difficulty using written or academic-functional skills when they affect daily participation and independence.', 'When clinically relevant, these deficits interfere with communication, independence, and access to routines.', 40),

    ('coping_self_regulation', 'coping_skills_flexibility', 'Coping Skills and Flexibility', 'Difficulty adapting to disappointment, change, delay, transitions, or non-preferred conditions.', 'Poor coping and flexibility can drive maladaptive responding and reduce access to instruction and daily routines.', 10),
    ('coping_self_regulation', 'restricted_repetitive_behavior_support', 'Restricted or Repetitive Behavior Support', 'Needs related to rigid, repetitive, or circumscribed behavior patterns that interfere with functioning.', 'Restricted/repetitive behavior can limit participation, flexibility, and social learning across settings.', 20),
    ('coping_self_regulation', 'self_regulation_behavior_support', 'Self-Regulation and Behavior Support', 'Difficulty regulating emotional, behavioral, or sensory responses in a way that supports safe and effective functioning.', 'Self-regulation deficits can impair safety, learning, and community participation.', 30),

    ('caregiver_support', 'caregiver_implementation', 'Caregiver Implementation', 'Caregiver needs support to implement intervention strategies, prompting systems, or generalization procedures correctly and consistently.', 'Caregiver implementation directly affects treatment integrity, maintenance, and generalization.', 10),
    ('caregiver_support', 'caregiver_generalization_support', 'Caregiver Generalization Support', 'Caregiver needs support extending learned skills across settings, routines, and people.', 'Generalization support is medically necessary when skill use outside direct treatment remains limited.', 20)
) AS x(domain_slug, slug, name, description, medical_necessity_summary, display_order)
  ON d.slug = x.domain_slug
ON CONFLICT (domain_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    medical_necessity_summary = EXCLUDED.medical_necessity_summary,
    display_order = EXCLUDED.display_order;
