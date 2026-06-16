-- Seed DBN Culture Diagnostic questions
-- Run this in the Supabase SQL editor.
-- Deletes all existing questions for the active survey and inserts the 52 DBN questions.

DO $$
DECLARE
  v_survey_id uuid;
BEGIN
  SELECT id INTO v_survey_id FROM survey ORDER BY created_at ASC LIMIT 1;

  IF v_survey_id IS NULL THEN
    RAISE EXCEPTION 'No survey found — create a survey first.';
  END IF;

  DELETE FROM survey_questions WHERE survey_id = v_survey_id;

  INSERT INTO survey_questions (survey_id, question_type, text, dimension, order_num) VALUES

  -- 01 Strategic Coherence
  (v_survey_id, 'LIKERT', 'I understand DBN''s strategic priorities clearly enough to explain them in my own words.',  'Strategic Coherence',          1),
  (v_survey_id, 'LIKERT', 'I understand how my role contributes to DBN''s mandate and strategic objectives.',          'Strategic Coherence',          2),
  (v_survey_id, 'LIKERT', 'When priorities compete, I know what DBN''s strategy says should come first.',              'Strategic Coherence',          3),
  (v_survey_id, 'LIKERT', 'In my area, day-to-day decisions and work priorities are guided by DBN''s strategic direction.', 'Strategic Coherence',    4),

  -- 02 Systems Intelligence
  (v_survey_id, 'LIKERT', 'Work between departments is coordinated around shared DBN outcomes, not only departmental priorities.', 'Systems Intelligence', 5),
  (v_survey_id, 'LIKERT', 'DBN''s systems and processes make it easy for teams to share information and complete work across functions.', 'Systems Intelligence', 6),
  (v_survey_id, 'LIKERT', 'When work moves from one team to another, responsibilities, timelines and handovers are clear.', 'Systems Intelligence',   7),
  (v_survey_id, 'LIKERT', 'Leaders and managers make decisions with the impact on the full DBN value chain in mind.',  'Systems Intelligence',         8),

  -- 03 Execution Discipline
  (v_survey_id, 'LIKERT', 'My role, responsibilities, performance expectations and decision boundaries are clear.',    'Execution Discipline',         9),
  (v_survey_id, 'LIKERT', 'Performance standards in my area are clear, measurable and applied consistently.',          'Execution Discipline',         10),
  (v_survey_id, 'LIKERT', 'Decisions and agreed actions are followed through within reasonable timeframes.',            'Execution Discipline',         11),
  (v_survey_id, 'LIKERT', 'Underperformance or non-delivery is addressed fairly, directly and timeously.',             'Execution Discipline',         12),

  -- 04 Purpose and Meaning
  (v_survey_id, 'LIKERT', 'I understand DBN''s purpose and why its work matters for Namibia.',                         'Purpose and Meaning',          13),
  (v_survey_id, 'LIKERT', 'I can see a clear link between my work and DBN''s development mandate.',                    'Purpose and Meaning',          14),
  (v_survey_id, 'LIKERT', 'DBN''s purpose gives meaning to the work I do.',                                            'Purpose and Meaning',          15),
  (v_survey_id, 'LIKERT', 'I am proud of the impact DBN is working to create.',                                        'Purpose and Meaning',          16),

  -- 05 Governance and Decision-rights
  (v_survey_id, 'LIKERT', 'I understand where decisions that affect my work should be made and who has authority to make them.', 'Governance and Decision-rights', 17),
  (v_survey_id, 'LIKERT', 'Decisions are made at the right level without unnecessary escalation.',                     'Governance and Decision-rights', 18),
  (v_survey_id, 'LIKERT', 'Decisions that affect my work are communicated clearly and in time for me to act on them.', 'Governance and Decision-rights', 19),
  (v_survey_id, 'LIKERT', 'Approval processes help manage risk without unnecessarily delaying delivery.',               'Governance and Decision-rights', 20),

  -- 06 Value Recognition
  (v_survey_id, 'LIKERT', 'My contribution to DBN''s work is noticed and acknowledged in a fair way.',                 'Value Recognition',            21),
  (v_survey_id, 'LIKERT', 'Recognition, reward and progression are based on contribution and performance, not personal relationships.', 'Value Recognition', 22),
  (v_survey_id, 'LIKERT', 'I receive regular, honest feedback that helps me understand how I am performing.',           'Value Recognition',            23),
  (v_survey_id, 'LIKERT', 'Good performance is recognised in ways that encourage accountability, motivation and growth.', 'Value Recognition',          24),

  -- 07 Listening and Learning
  (v_survey_id, 'LIKERT', 'Leaders seek to understand issues properly before drawing conclusions.',                     'Listening and Learning',       25),
  (v_survey_id, 'LIKERT', 'Feedback from employees is treated as useful information, even when it is difficult to hear.', 'Listening and Learning',    26),
  (v_survey_id, 'LIKERT', 'Lessons from work, projects and setbacks are shared so that teams can improve.',             'Listening and Learning',       27),
  (v_survey_id, 'LIKERT', 'Employee feedback and lessons learned lead to visible improvements in how work is done at DBN.', 'Listening and Learning',  28),

  -- 08 Leadership Influence
  (v_survey_id, 'LIKERT', 'My manager gives clear and consistent direction about priorities and expectations.',         'Leadership Influence',         29),
  (v_survey_id, 'LIKERT', 'My manager is accessible when I need guidance, clarity or support.',                        'Leadership Influence',         30),
  (v_survey_id, 'LIKERT', 'My manager models the standards and behaviours they expect from others.',                   'Leadership Influence',         31),
  (v_survey_id, 'LIKERT', 'My manager helps create a team environment where people can perform, learn and work well together.', 'Leadership Influence', 32),

  -- 09 Psychological Safety
  (v_survey_id, 'LIKERT', 'I can raise concerns about work issues without fear of negative consequences.',              'Psychological Safety',         33),
  (v_survey_id, 'LIKERT', 'People can respectfully question ideas or decisions, regardless of level or position.',     'Psychological Safety',         34),
  (v_survey_id, 'LIKERT', 'Mistakes are discussed in a way that supports learning and improvement, not blame.',         'Psychological Safety',         35),
  (v_survey_id, 'LIKERT', 'I feel respected and valued at DBN as a person, not only for the work I deliver.',          'Psychological Safety',         36),

  -- 10 Innovation
  (v_survey_id, 'LIKERT', 'I am encouraged to suggest better ways of working, even when they challenge existing practice.', 'Innovation',              37),
  (v_survey_id, 'LIKERT', 'When a well-considered new approach does not work, it is treated as a learning opportunity.', 'Innovation',                38),
  (v_survey_id, 'LIKERT', 'DBN creates space for people across teams to develop and test new ideas.',                  'Innovation',                   39),
  (v_survey_id, 'LIKERT', 'New ideas that can improve DBN''s mandate delivery are supported with enough time, attention or resources to move forward.', 'Innovation', 40),

  -- 11 Agility and Resilience
  (v_survey_id, 'LIKERT', 'My team adapts effectively when priorities, conditions or stakeholder demands change.',      'Agility and Resilience',       41),
  (v_survey_id, 'LIKERT', 'Under pressure, we find practical solutions without compromising quality, ethics or service.', 'Agility and Resilience',    42),
  (v_survey_id, 'LIKERT', 'Decisions are made quickly enough to keep important work moving.',                           'Agility and Resilience',       43),
  (v_survey_id, 'LIKERT', 'After setbacks or disruptions, DBN reflects, learns and adjusts its approach.',             'Agility and Resilience',       44),

  -- 12 Customer Orientation
  (v_survey_id, 'LIKERT', 'I understand who depends on my work, both inside and outside DBN, and what they need from me.', 'Customer Orientation',    45),
  (v_survey_id, 'LIKERT', 'We consider the impact of our decisions on customers, stakeholders and internal service users.', 'Customer Orientation',   46),
  (v_survey_id, 'LIKERT', 'Customer and stakeholder needs shape how DBN plans, prioritises and improves work.',         'Customer Orientation',         47),
  (v_survey_id, 'LIKERT', 'When a customer or stakeholder raises a concern, it is taken seriously and responded to within a reasonable time.', 'Customer Orientation', 48),

  -- Open-ended
  (v_survey_id, 'LONG_TEXT', 'What is working well in your division that DBN should protect and build on?',            'Open-ended',                   49),
  (v_survey_id, 'LONG_TEXT', 'Where do handovers, processes, systems or decision-making slow down your division''s ability to deliver?', 'Open-ended', 50),
  (v_survey_id, 'LONG_TEXT', 'What should DBN continue, stop or change to strengthen its culture and employee experience?', 'Open-ended',             51),
  (v_survey_id, 'LONG_TEXT', 'What is one issue leadership may not fully see or understand, but needs to take seriously?', 'Open-ended',              52);

  RAISE NOTICE 'Inserted 52 questions for survey %', v_survey_id;
END $$;
