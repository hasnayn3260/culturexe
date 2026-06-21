-- Seed DBN Culture Diagnostic questions  (v5 — 62 questions)
-- Run this in the Supabase SQL editor.
-- Deletes all existing questions for the active survey and inserts fresh ones.

DO $$
DECLARE
  v_survey_id uuid;
BEGIN
  SELECT id INTO v_survey_id FROM survey ORDER BY created_at ASC LIMIT 1;

  IF v_survey_id IS NULL THEN
    RAISE EXCEPTION 'No survey found — create a survey first.';
  END IF;

  DELETE FROM survey_questions WHERE survey_id = v_survey_id;

  INSERT INTO survey_questions (survey_id, question_type, text, dimension, hint, options, order_num) VALUES

  -- ── 01 Strategic Coherence ──────────────────────────────
  (v_survey_id, 'LIKERT', 'I understand DBN''s strategic priorities clearly enough to explain them in my own words.',        'Strategic Coherence',            NULL, NULL,  1),
  (v_survey_id, 'LIKERT', 'I understand how my role contributes to DBN''s mandate and strategic objectives.',                'Strategic Coherence',            NULL, NULL,  2),
  (v_survey_id, 'LIKERT', 'When priorities compete, I know what DBN''s strategy says should come first.',                   'Strategic Coherence',            NULL, NULL,  3),
  (v_survey_id, 'LIKERT', 'In my area, day-to-day decisions and work priorities are guided by DBN''s strategic direction.',  'Strategic Coherence',            NULL, NULL,  4),

  -- ── 02 Systems Intelligence ─────────────────────────────
  (v_survey_id, 'LIKERT', 'Work between departments is coordinated around shared DBN outcomes, not only departmental priorities.',                          'Systems Intelligence',           NULL, NULL,  5),
  (v_survey_id, 'LIKERT', 'DBN''s systems and processes make it easy for teams to share information and complete work across functions.',                   'Systems Intelligence',           NULL, NULL,  6),
  (v_survey_id, 'LIKERT', 'When work moves from one team to another, responsibilities, timelines and handovers are clear.',                                 'Systems Intelligence',           NULL, NULL,  7),
  (v_survey_id, 'LIKERT', 'My direct line manager makes decisions with the impact on the full DBN value chain in mind.',                                    'Systems Intelligence',           NULL, NULL,  8),

  -- ── 03 Execution Discipline ─────────────────────────────
  (v_survey_id, 'LIKERT', 'My role, responsibilities, performance expectations and decision boundaries are clear.',                                          'Execution Discipline',           NULL, NULL,  9),
  (v_survey_id, 'LIKERT', 'Performance standards in my area are clear, measurable and applied consistently.',                                               'Execution Discipline',           NULL, NULL, 10),
  (v_survey_id, 'LIKERT', 'Decisions and agreed actions are followed through within reasonable timeframes.',                                                 'Execution Discipline',           NULL, NULL, 11),
  (v_survey_id, 'LIKERT', 'Performance, conduct and non-delivery are addressed fairly, directly and consistently across DBN.',                              'Execution Discipline',           NULL, NULL, 12),

  -- ── 04 Purpose and Meaning ──────────────────────────────
  (v_survey_id, 'LIKERT', 'I understand DBN''s purpose and why its work matters for Namibia.',                                                              'Purpose and Meaning',            NULL, NULL, 13),
  (v_survey_id, 'LIKERT', 'I can see a clear link between my work and DBN''s development mandate.',                                                         'Purpose and Meaning',            NULL, NULL, 14),
  (v_survey_id, 'LIKERT', 'DBN''s purpose gives meaning to the work I do.',                                                                                 'Purpose and Meaning',            NULL, NULL, 15),
  (v_survey_id, 'LIKERT', 'I am proud of the impact DBN is working to create.',                                                                             'Purpose and Meaning',            NULL, NULL, 16),

  -- ── 05 Governance and Decision-rights ───────────────────
  (v_survey_id, 'LIKERT', 'I understand where decisions that affect my work should be made and who has authority to make them.',                             'Governance and Decision-rights', NULL, NULL, 17),
  (v_survey_id, 'LIKERT', 'Decisions are made at the right level without unnecessary escalation.',                                                           'Governance and Decision-rights', NULL, NULL, 18),
  (v_survey_id, 'LIKERT', 'Decisions that affect my work are communicated clearly for me to act on them.',                                                  'Governance and Decision-rights', NULL, NULL, 19),
  (v_survey_id, 'LIKERT', 'Approval processes help manage risk without unnecessarily delaying delivery.',                                                    'Governance and Decision-rights', NULL, NULL, 20),
  (v_survey_id, 'LIKERT', 'I trust DBN''s people-related processes to be handled fairly, consistently and confidentially.',                                  'Governance and Decision-rights', NULL, NULL, 21),

  -- ── 06 Value Recognition ────────────────────────────────
  (v_survey_id, 'LIKERT', 'My direct line manager recognises my contribution and supports fair access to growth and development opportunities.',             'Value Recognition',              NULL, NULL, 22),
  (v_survey_id, 'LIKERT', 'My pay, benefits and rewards are fair in relation to my role, responsibilities, contribution and performance.',                   'Value Recognition',              NULL, NULL, 23),
  (v_survey_id, 'LIKERT', 'I receive regular, honest feedback from my direct line manager that helps me understand how I am performing and where I can improve.', 'Value Recognition',         NULL, NULL, 24),
  (v_survey_id, 'LIKERT', 'Appointments, promotions, recognition, rewards and development opportunities at DBN are based on transparent criteria, contribution and performance rather than personal relationships.', 'Value Recognition', NULL, NULL, 25),

  -- ── 07 Listening and Learning ───────────────────────────
  (v_survey_id, 'LIKERT', 'My direct line manager seeks to understand issues properly before drawing conclusions.',                                          'Listening and Learning',         NULL, NULL, 26),
  (v_survey_id, 'LIKERT', 'My direct line manager treats feedback from me as useful information, even when it is difficult to hear.',                        'Listening and Learning',         NULL, NULL, 27),
  (v_survey_id, 'LIKERT', 'Lessons from work, projects and setbacks are shared so that teams can improve.',                                                  'Listening and Learning',         NULL, NULL, 28),
  (v_survey_id, 'LIKERT', 'Employee feedback and lessons learned lead to visible improvements in how work is done at DBN.',                                  'Listening and Learning',         NULL, NULL, 29),

  -- ── 08 Leadership Influence ─────────────────────────────
  (v_survey_id, 'LIKERT', 'My direct line manager gives clear and consistent direction about priorities and expectations in my work area.',                  'Leadership Influence',           NULL, NULL, 30),
  (v_survey_id, 'LIKERT', 'My direct line manager is accessible when I need guidance, clarity or support.',                                                  'Leadership Influence',           NULL, NULL, 31),
  (v_survey_id, 'LIKERT', 'My direct line manager models the standards and behaviours they expect from others.',                                             'Leadership Influence',           NULL, NULL, 32),
  (v_survey_id, 'LIKERT', 'My direct line manager helps create a team environment where people can perform, learn and work well together.',                  'Leadership Influence',           NULL, NULL, 33),

  -- ── 09 Psychological Safety ─────────────────────────────
  (v_survey_id, 'LIKERT', 'I can raise work-related concerns with my direct line manager without fear of retaliation or negative consequences.',             'Psychological Safety',           NULL, NULL, 34),
  (v_survey_id, 'LIKERT', 'I can respectfully question anyone''s ideas or decisions, regardless of their level or position.',                               'Psychological Safety',           NULL, NULL, 35),
  (v_survey_id, 'LIKERT', 'Mistakes are discussed with my manager in a way that supports learning and improvement, not blame.',                              'Psychological Safety',           NULL, NULL, 36),
  (v_survey_id, 'LIKERT', 'I feel respected and valued at DBN as a person, not only for the work I deliver.',                                               'Psychological Safety',           NULL, NULL, 37),

  -- ── 10 Innovation ───────────────────────────────────────
  (v_survey_id, 'LIKERT', 'I am encouraged to suggest better ways of working, even when they challenge existing practice.',                                  'Innovation',                     NULL, NULL, 38),
  (v_survey_id, 'LIKERT', 'When new ideas do not work, my team uses the experience to learn and improve.',                                                   'Innovation',                     NULL, NULL, 39),
  (v_survey_id, 'LIKERT', 'My department creates space for people across teams to develop and test new ideas.',                                              'Innovation',                     NULL, NULL, 40),
  (v_survey_id, 'LIKERT', 'My direct line manager supports new ideas that can help DBN improve its work.',                                                   'Innovation',                     NULL, NULL, 41),

  -- ── 11 Agility and Resilience ───────────────────────────
  (v_survey_id, 'LIKERT', 'My team adapts effectively when priorities, conditions or stakeholder demands change.',                                            'Agility and Resilience',         NULL, NULL, 42),
  (v_survey_id, 'LIKERT', 'Under pressure, my team finds practical solutions without compromising quality, ethics or service.',                               'Agility and Resilience',         NULL, NULL, 43),
  (v_survey_id, 'LIKERT', 'My direct line manager helps my team reprioritise and adapt when circumstances or work demands change.',                          'Agility and Resilience',         NULL, NULL, 44),
  (v_survey_id, 'LIKERT', 'My team has the capacity, resources and wellbeing support needed to respond effectively during periods of change or pressure.',   'Agility and Resilience',         NULL, NULL, 45),

  -- ── 12 Customer Orientation ─────────────────────────────
  (v_survey_id, 'LIKERT', 'I understand who depends on my work, both inside and outside DBN, and what they need from me.',                                  'Customer Orientation',           NULL, NULL, 46),
  (v_survey_id, 'LIKERT', 'We consider the impact of our decisions on customers, stakeholders and internal service users.',                                  'Customer Orientation',           NULL, NULL, 47),
  (v_survey_id, 'LIKERT', 'Customer and stakeholder needs shape how my team plans, prioritises and improves work.',                                          'Customer Orientation',           NULL, NULL, 48),
  (v_survey_id, 'LIKERT', 'When a customer or stakeholder raises a concern, it is taken seriously and responded to within a reasonable time by my team.',   'Customer Orientation',           NULL, NULL, 49),

  -- ── 13 EXCO Trust Index ─────────────────────────────────
  -- "EXCO" = DBN's Executive Committee as a collective body, not your direct line manager or one individual executive.
  (v_survey_id, 'LIKERT', 'I trust EXCO to act in the best interests of DBN and its employees.',                                                            'EXCO Trust Index', 'EXCO refers to DBN''s Executive Committee as a collective leadership team — not your direct line manager or one individual executive.', NULL, 50),
  (v_survey_id, 'LIKERT', 'EXCO provides clear and consistent direction on DBN''s priorities and what matters most.',                                        'EXCO Trust Index',               NULL, NULL, 51),
  (v_survey_id, 'LIKERT', 'EXCO communicates important decisions and changes clearly enough for employees to understand what is changing and why.',           'EXCO Trust Index',               NULL, NULL, 52),
  (v_survey_id, 'LIKERT', 'EXCO models the standards, accountability and behaviours expected across DBN.',                                                   'EXCO Trust Index',               NULL, NULL, 53),
  (v_survey_id, 'LIKERT', 'EXCO acts fairly and consistently when making or approving people-related decisions.',                                            'EXCO Trust Index',               NULL, NULL, 54),
  (v_survey_id, 'LIKERT', 'EXCO creates an environment where employees can raise concerns without fear of retaliation or negative consequences.',            'EXCO Trust Index',               NULL, NULL, 55),
  (v_survey_id, 'LIKERT', 'EXCO takes employee wellbeing, workload and organisational pressure seriously when making decisions.',                             'EXCO Trust Index',               NULL, NULL, 56),
  (v_survey_id, 'LIKERT', 'When employee feedback is raised, EXCO follows through in ways that lead to visible improvement.',                                'EXCO Trust Index',               NULL, NULL, 57),

  -- ── 14 Overall Recommendation (NPS 0–10) ────────────────
  (v_survey_id, 'RATING_SCALE', 'How likely are you to recommend DBN as a good place to work to a friend, family member or colleague?', 'Overall Recommendation', NULL, '{"min": 0, "max": 10, "min_label": "Not at all likely", "max_label": "Extremely likely"}'::jsonb, 58),

  -- ── 15 Open Questions ───────────────────────────────────
  (v_survey_id, 'LONG_TEXT', 'What gets in the way of you doing your best work at DBN?',                                                                    'Open Questions',                 NULL, NULL, 59),
  (v_survey_id, 'LONG_TEXT', 'Where do handovers, processes, systems or decision-making slow down your division''s ability to deliver?',                    'Open Questions',                 NULL, NULL, 60),
  (v_survey_id, 'LONG_TEXT', 'What should DBN continue, stop or change to strengthen its culture and employee experience?',                                 'Open Questions',                 NULL, NULL, 61),
  (v_survey_id, 'LONG_TEXT', 'What is one issue the Executive leadership may not fully see or understand, but needs to take seriously?',                    'Open Questions',                 NULL, NULL, 62);

  RAISE NOTICE 'Inserted 62 questions for survey %', v_survey_id;
END $$;
