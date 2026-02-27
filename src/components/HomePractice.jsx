import { useState, useMemo } from 'react'
import { framework, ASSESSMENT_LEVELS } from '../data/framework.js'

/* ─────────────────────────────────────────────
   Parent-Friendly Domain Names
   ───────────────────────────────────────────── */

const DOMAIN_LABELS = {
  d1: 'Managing Feelings & Energy',
  d2: 'Understanding Themselves',
  d3: 'Planning & Problem Solving',
  d4: 'Understanding Others',
  d5: 'Expressing Needs & Ideas',
  d6: 'Getting Along with Others',
  d7: 'Thinking & Learning',
  d8: 'Staying Safe',
  d9: 'Support & Environment',
}

const DOMAIN_ACCENTS = {
  d1: { border: '#e06b5f', bg: '#fdf2f1', text: '#b63a2e' },
  d2: { border: '#d4884e', bg: '#fdf5ef', text: '#9a5c2e' },
  d3: { border: '#c49a6c', bg: '#fdf8f0', text: '#9a6740' },
  d4: { border: '#b5a354', bg: '#fbf9ee', text: '#7a6e34' },
  d5: { border: '#7fb589', bg: '#f2f9f3', text: '#3d7a49' },
  d6: { border: '#5ea8a0', bg: '#eef7f6', text: '#367a73' },
  d7: { border: '#6a9ec0', bg: '#eff6fb', text: '#3a6d8c' },
  d8: { border: '#8b8ec4', bg: '#f2f2fa', text: '#55588a' },
  d9: { border: '#a88db5', bg: '#f6f1f8', text: '#6d5279' },
}

/* ─────────────────────────────────────────────
   SVG Icons (inline, no emoji)
   ───────────────────────────────────────────── */

const ICONS = {
  home: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9" />
    </svg>
  ),
  clock: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.5v4l2.5 1.5" />
    </svg>
  ),
  star: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2l2.4 4.8L18 7.6l-4 3.9.9 5.5L10 14.5 5.1 17l.9-5.5-4-3.9 5.6-.8L10 2z" />
    </svg>
  ),
  people: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6" r="2.5" />
      <path d="M2 16c0-3 2.5-5 5-5s5 2 5 5" />
      <circle cx="14" cy="7" r="2" />
      <path d="M14 11c2 0 4 1.5 4 4" />
    </svg>
  ),
  materials: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <path d="M7 7h6M7 10h6M7 13h3" />
    </svg>
  ),
  filter: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h14M5 8h10M7 12h6M9 16h2" />
    </svg>
  ),
  heart: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
    </svg>
  ),
  sparkle: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  play: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M6.5 4.5v11l9-5.5-9-5.5z" />
    </svg>
  ),
}

/* ─────────────────────────────────────────────
   Activity Database
   ───────────────────────────────────────────── */

const ACTIVITIES = {
  d1: [
    {
      title: 'Breathing Buddies',
      description: 'Place a stuffed animal on your child\'s tummy while they lie down. Have them breathe slowly to make the buddy rise and fall. This teaches deep breathing in a playful way that kids actually enjoy.',
      targetSkills: 'Calming down, noticing body signals, managing energy levels',
      ages: '3-8',
      time: '5-10 min',
      difficulty: 'Easy',
      materials: 'Stuffed animal',
    },
    {
      title: 'Energy Check-In',
      description: 'Use a simple 1-5 scale (or colors) to check in before and after activities. "Are you at a 1 (sleepy) or a 5 (bouncing off the walls)?" Helps kids start to notice their own energy levels without judgment.',
      targetSkills: 'Noticing internal signals, self-awareness of arousal',
      ages: 'All ages',
      time: '2-5 min',
      difficulty: 'Easy',
      materials: 'None (or a printed scale)',
    },
    {
      title: 'Shake It Out Dance Party',
      description: 'Put on a favorite song and shake out all the wiggles. Then freeze when the music stops and notice how your body feels. Great for transitions or when energy is too high or too low.',
      targetSkills: 'Using movement to regulate, calming up and calming down',
      ages: '3-10',
      time: '5-10 min',
      difficulty: 'Easy',
      materials: 'Music',
    },
    {
      title: 'Calm-Down Corner Design',
      description: 'Work together to create a special cozy spot in your home with comforting items — a soft blanket, a favorite book, a squishy toy. Designing it together gives your child ownership over their own calming strategies.',
      targetSkills: 'Using regulation supports, tolerating discomfort',
      ages: '4-12',
      time: '20-30 min',
      difficulty: 'Medium',
      materials: 'Blankets, pillows, comfort items',
    },
    {
      title: 'Hot Cocoa Breathing',
      description: 'Pretend to hold a mug of hot cocoa. Smell the chocolate (breathe in through nose), blow to cool it down (breathe out through mouth). Repeat five times. A simple visual that makes breathing exercises feel natural.',
      targetSkills: 'Calming down, following simple calming cues',
      ages: '3-7',
      time: '2-5 min',
      difficulty: 'Easy',
      materials: 'None',
    },
  ],
  d2: [
    {
      title: 'Feelings Detective',
      description: 'While watching a show or reading a book, pause and ask your child to guess how a character is feeling and why. Then connect it: "Have you ever felt that way?" Builds emotional vocabulary naturally.',
      targetSkills: 'Naming feelings, connecting emotions to situations',
      ages: '4-10',
      time: '10-15 min',
      difficulty: 'Easy',
      materials: 'Book or TV show',
    },
    {
      title: 'Body Map Drawing',
      description: 'Trace your child\'s body on a large piece of paper. Ask them to color where they feel different emotions — "Where do you feel mad? Where do you feel nervous?" Helps connect body sensations to emotions.',
      targetSkills: 'Mapping emotions to body, noticing internal signals',
      ages: '5-12',
      time: '15-20 min',
      difficulty: 'Medium',
      materials: 'Large paper, crayons or markers',
    },
    {
      title: 'Highs and Lows at Dinner',
      description: 'At mealtime, each family member shares their high (best part) and low (hardest part) of the day. Normalizes talking about feelings and builds self-reflection as a daily habit.',
      targetSkills: 'Identifying triggers, recognizing emotional patterns',
      ages: 'All ages',
      time: '5-10 min',
      difficulty: 'Easy',
      materials: 'None',
    },
    {
      title: 'Feelings Journal',
      description: 'Keep a simple journal where your child can draw or write about their day. Even a smiley-face rating is great. Over time, they\'ll start recognizing their own patterns and triggers.',
      targetSkills: 'Self-reflection, predicting reactions, recognizing limits',
      ages: '6-12',
      time: '5-10 min',
      difficulty: 'Medium',
      materials: 'Notebook, crayons or pencil',
    },
    {
      title: 'Mirror Faces Game',
      description: 'Take turns making emotion faces in the mirror and guessing the feeling. Silly faces are allowed! This simple game helps kids connect facial expressions with emotional labels.',
      targetSkills: 'Differentiating emotional states, using accessible labels',
      ages: '3-7',
      time: '5-10 min',
      difficulty: 'Easy',
      materials: 'Mirror',
    },
  ],
  d3: [
    {
      title: 'Plan the Snack',
      description: 'Let your child plan and make a simple snack from start to finish. What do we need? What step comes first? They practice sequencing, organizing, and following through — all in a context they care about.',
      targetSkills: 'Planning, sequencing steps, organizing materials',
      ages: '4-10',
      time: '10-15 min',
      difficulty: 'Easy',
      materials: 'Snack ingredients',
    },
    {
      title: 'Timer Challenges',
      description: 'Set a timer and see if your child can complete a small task before it goes off — putting away toys, getting dressed, setting the table. Builds initiation and persistence in a low-pressure, game-like way.',
      targetSkills: 'Initiation, persistence, self-monitoring',
      ages: '4-10',
      time: '5-10 min',
      difficulty: 'Easy',
      materials: 'Timer or phone',
    },
    {
      title: 'Backward Planning Game',
      description: '"We need to leave the house by 8:00. What do we need to do before that?" Work backward together to figure out the steps and when to start each one. Teaches planning without it feeling like a lesson.',
      targetSkills: 'Planning, sequencing, time awareness',
      ages: '6-12',
      time: '5-10 min',
      difficulty: 'Medium',
      materials: 'None',
    },
    {
      title: 'Change of Plans Practice',
      description: 'Intentionally change a small plan and narrate through it together: "We were going to the park but it\'s raining — what could we do instead?" Helps practice flexibility in low-stakes moments.',
      targetSkills: 'Flexibility, adapting to changes, tolerating imperfection',
      ages: 'All ages',
      time: '5-10 min',
      difficulty: 'Medium',
      materials: 'None',
    },
    {
      title: 'First-Then Board',
      description: 'Create a simple visual board: "First ___, Then ___." For example: First homework, then tablet time. Helps children see the sequence and builds initiation for less-preferred tasks.',
      targetSkills: 'Initiation, overcoming inertia, following routines',
      ages: '3-8',
      time: '15-20 min',
      difficulty: 'Easy',
      materials: 'Paper, markers, velcro or tape (optional)',
    },
    {
      title: 'Oops, Try Again',
      description: 'When a mistake happens during any activity, model saying "Oops! That didn\'t work. Let me try again." Celebrate the retry, not just the result. Builds resilience and error recovery naturally.',
      targetSkills: 'Repairing mistakes, tolerating imperfection, self-monitoring',
      ages: 'All ages',
      time: '2-5 min',
      difficulty: 'Easy',
      materials: 'None',
    },
  ],
  d4: [
    {
      title: 'Guess What They\'re Thinking',
      description: 'While watching a show, pause and ask: "What do you think that character is thinking right now? Why?" Then watch to see if you were right. Makes perspective-taking feel like a fun guessing game.',
      targetSkills: 'Perspective-taking, inferring mental states',
      ages: '5-12',
      time: '10-15 min',
      difficulty: 'Easy',
      materials: 'TV show or movie',
    },
    {
      title: 'Size of the Problem',
      description: 'When something goes wrong, help your child rate it: "Is this a tiny problem, a medium problem, or a huge problem?" Then match the reaction to the size. Builds judgment without lecturing.',
      targetSkills: 'Sizing problems, matching response to situation',
      ages: '5-12',
      time: '2-5 min',
      difficulty: 'Easy',
      materials: 'None (or a printed scale)',
    },
    {
      title: 'Two Sides to Every Story',
      description: 'After a disagreement (even a small one), explore both sides: "You felt X, and they felt Y. Both make sense." No one has to be wrong — it\'s about understanding that different people see things differently.',
      targetSkills: 'Perspective-taking, understanding differing viewpoints',
      ages: '6-12',
      time: '5-10 min',
      difficulty: 'Medium',
      materials: 'None',
    },
    {
      title: 'Consequence Forecasting',
      description: 'Before making a choice, ask: "What do you think might happen if you do that?" Not as a warning — as genuine curiosity. Over time, this builds the habit of thinking ahead before acting.',
      targetSkills: 'Predicting consequences, evaluating risk',
      ages: '5-12',
      time: '2-5 min',
      difficulty: 'Medium',
      materials: 'None',
    },
    {
      title: 'People Watching Stories',
      description: 'While waiting somewhere (cafe, park, waiting room), quietly make up stories about people you see. "Where do you think they\'re going? How do they feel?" Fun, judgment-free perspective-taking practice.',
      targetSkills: 'Inferring mental states, reading situational cues',
      ages: '6-12',
      time: '5-10 min',
      difficulty: 'Easy',
      materials: 'None',
    },
  ],
  d5: [
    {
      title: 'Ask for Help Bingo',
      description: 'Create a bingo card with situations where asking for help is the goal — "needed something from a high shelf," "didn\'t understand directions," "felt stuck on homework." Celebrate each square filled in.',
      targetSkills: 'Requesting help, detecting when help is needed',
      ages: '5-12',
      time: '15-20 min',
      difficulty: 'Medium',
      materials: 'Paper, pen, small rewards (optional)',
    },
    {
      title: 'Choice Menus',
      description: 'Offer choices throughout the day and encourage your child to state their preference clearly: "Would you like apples or crackers? Tell me which one." Simple daily practice in expressing needs.',
      targetSkills: 'Expressing preferences, asserting needs',
      ages: '3-8',
      time: '2-5 min',
      difficulty: 'Easy',
      materials: 'None',
    },
    {
      title: 'Reporter Interview',
      description: 'Take turns being a "reporter" who interviews the other person about their day, a favorite hobby, or a made-up adventure. Builds expressive language, sequencing, and staying on topic — while being silly and fun.',
      targetSkills: 'Explaining clearly, sequencing details, staying on topic',
      ages: '5-12',
      time: '10-15 min',
      difficulty: 'Easy',
      materials: 'None (pretend microphone optional)',
    },
    {
      title: 'Negotiation Practice',
      description: 'When your child wants something, practice the steps: "What do you want? What might I say? What could we agree on?" Role-play low-stakes negotiations like bedtime, screen time, or dessert choices.',
      targetSkills: 'Negotiating, generating alternatives, accepting compromise',
      ages: '6-12',
      time: '5-10 min',
      difficulty: 'Medium',
      materials: 'None',
    },
    {
      title: 'Comfort Thermometer',
      description: 'Create a visual thermometer from 1-5 to express discomfort levels. Practice using it: "I\'m at a 2 — a little uncomfortable" or "I\'m at a 4 — I really need a break." Gives words to feelings before they escalate.',
      targetSkills: 'Expressing discomfort, translating feelings into communication',
      ages: '4-10',
      time: '10-15 min',
      difficulty: 'Easy',
      materials: 'Paper and markers',
    },
    {
      title: 'Fix-It Phrases',
      description: 'Practice phrases for when communication breaks down: "That\'s not what I meant," "Can I try saying that again?" or "I think we misunderstood each other." Having the words ready reduces frustration in the moment.',
      targetSkills: 'Repairing miscommunication, clarifying intent',
      ages: '6-12',
      time: '5-10 min',
      difficulty: 'Medium',
      materials: 'None (or write phrases on cards)',
    },
  ],
  d6: [
    {
      title: 'Turn-Taking Timer',
      description: 'During a board game or shared activity, use a timer so each person gets a clear, fair turn. Narrate the waiting: "It\'s hard to wait, and you\'re doing it." Builds turn-taking and tolerance of waiting.',
      targetSkills: 'Turn-taking, inhibiting impulses, tolerating waiting',
      ages: '4-10',
      time: '15-20 min',
      difficulty: 'Easy',
      materials: 'Timer, board game or shared activity',
    },
    {
      title: 'Compliment Circle',
      description: 'At family time, go around and each person gives someone else a genuine compliment. Model specific compliments: "I liked how you shared your crayons today." Teaches positive social connection.',
      targetSkills: 'Social connection, recognizing positive actions in others',
      ages: 'All ages',
      time: '5-10 min',
      difficulty: 'Easy',
      materials: 'None',
    },
    {
      title: 'Cooperation Challenge',
      description: 'Work on something together that requires teamwork — building with blocks, making a puzzle, cooking a meal. The key: neither person can do it alone. Practice asking, waiting, and sharing the work.',
      targetSkills: 'Cooperation, fairness, maintaining connection during tasks',
      ages: '4-12',
      time: '15-20 min',
      difficulty: 'Medium',
      materials: 'Puzzle, blocks, or recipe ingredients',
    },
    {
      title: 'Friendship Role-Play',
      description: 'Act out common social situations: "Someone wants to join your game," "Your friend is upset," "Someone disagrees with you." Practice possible responses together in a safe space before facing them for real.',
      targetSkills: 'Perspective-taking, social norms, repair after conflict',
      ages: '5-12',
      time: '10-15 min',
      difficulty: 'Medium',
      materials: 'None',
    },
    {
      title: 'The Agreement Game',
      description: 'Practice having small disagreements and finding solutions together. "You want pizza, I want tacos — what could we do?" Builds the skill of disagreeing without it becoming a big deal.',
      targetSkills: 'Disagreement without rupture, accepting compromise',
      ages: '5-12',
      time: '5-10 min',
      difficulty: 'Medium',
      materials: 'None',
    },
  ],
  d7: [
    {
      title: 'What Would Happen If?',
      description: 'Take turns asking wild hypothetical questions: "What would happen if dogs could talk? If it rained candy?" Encourages creative thinking, hypothesis generation, and the joy of imagination.',
      targetSkills: 'Hypothetical thinking, generating ideas, flexible reasoning',
      ages: '4-12',
      time: '5-10 min',
      difficulty: 'Easy',
      materials: 'None',
    },
    {
      title: 'Mistake of the Day',
      description: 'At dinner or bedtime, each family member shares a mistake they made and what they learned from it. Normalizes imperfection and separates mistakes from identity — "I made a mistake" is different from "I\'m bad."',
      targetSkills: 'Resilience after mistakes, self-talk, separating event from identity',
      ages: 'All ages',
      time: '5-10 min',
      difficulty: 'Easy',
      materials: 'None',
    },
    {
      title: 'I Can\'t Do This... Yet',
      description: 'When your child says "I can\'t do this," gently add the word "yet." Talk about things you couldn\'t do once but can now. Build a "Yet List" of things they\'re still learning. Shifts mindset without dismissing frustration.',
      targetSkills: 'Confidence, maintaining effort, updating self-narratives',
      ages: 'All ages',
      time: '5-10 min',
      difficulty: 'Easy',
      materials: 'None (or paper for a Yet List)',
    },
    {
      title: 'Invention Workshop',
      description: 'Give your child random household items and challenge them to "invent" something. There are no wrong answers. Builds creative problem-solving, flexible thinking, and comfort with open-ended tasks.',
      targetSkills: 'Creative thinking, generating alternatives, tolerating ambiguity',
      ages: '5-12',
      time: '15-20 min',
      difficulty: 'Medium',
      materials: 'Random household items (tape, boxes, cups, etc.)',
    },
    {
      title: 'Teaching the Teacher',
      description: 'Ask your child to teach you something they know well — a game, a drawing technique, a fact about their favorite topic. Teaching requires organizing thoughts, explaining clearly, and assessing understanding.',
      targetSkills: 'Self-confidence, organizing ideas, metacognition',
      ages: '5-12',
      time: '10-15 min',
      difficulty: 'Medium',
      materials: 'Varies by topic',
    },
  ],
  d8: [
    {
      title: 'Safety Scavenger Hunt',
      description: 'Walk through your home room by room and have your child spot things that could be unsafe — hot stove, cleaning supplies, sharp objects. Make it a team effort, not a test. Builds awareness naturally.',
      targetSkills: 'Recognizing danger, detecting environmental risks',
      ages: '4-10',
      time: '15-20 min',
      difficulty: 'Easy',
      materials: 'None',
    },
    {
      title: 'Emergency Practice Drills',
      description: 'Practice what to do in different situations: fire alarm goes off, a stranger approaches, you get lost in a store. Keep it calm and matter-of-fact — not scary. Repetition builds confidence for real moments.',
      targetSkills: 'Responding to emergencies, following safety procedures',
      ages: '4-12',
      time: '10-15 min',
      difficulty: 'Medium',
      materials: 'None',
    },
    {
      title: 'Safe vs. Unsafe Sorting',
      description: 'Use picture cards or draw scenarios. Sort them into "safe" and "unsafe" piles. Discuss borderline cases: "Is this unsafe or just uncomfortable?" Building this distinction matters enormously.',
      targetSkills: 'Differentiating danger from discomfort, risk assessment',
      ages: '4-10',
      time: '10-15 min',
      difficulty: 'Easy',
      materials: 'Paper and markers (or printed picture cards)',
    },
    {
      title: 'Stop and Think Practice',
      description: 'Play a game where you call out "Stop!" at random moments and your child freezes. Then ask: "What should you do next?" Builds the impulse-control muscle needed for safety moments.',
      targetSkills: 'Suppressing impulse, interrupting current action, following directions',
      ages: '3-8',
      time: '5-10 min',
      difficulty: 'Easy',
      materials: 'None',
    },
    {
      title: 'My Safe People Map',
      description: 'Together, draw or list the people your child can go to for help in different places — at home, at school, in the neighborhood. Knowing who is safe and available builds security and preparedness.',
      targetSkills: 'Recognizing safe adults, knowing who to turn to in crisis',
      ages: '4-12',
      time: '10-15 min',
      difficulty: 'Easy',
      materials: 'Paper and markers',
    },
  ],
  d9: [
    {
      title: 'Routine Builder',
      description: 'Create a visual daily schedule together using drawings, photos, or words. Let your child help decide the order and decorate it. Having a predictable routine they helped build reduces anxiety and power struggles.',
      targetSkills: 'Consistency, predictable expectations, reducing ambiguity',
      ages: '3-10',
      time: '20-30 min',
      difficulty: 'Medium',
      materials: 'Paper, markers, photos or stickers (optional)',
    },
    {
      title: 'Praise Spotting',
      description: 'Set a goal to catch your child doing something well at least five times today — and tell them specifically what you noticed. "You waited so patiently just now." Specific praise is the most powerful support tool available.',
      targetSkills: 'Reinforcement, building confidence through specific feedback',
      ages: 'All ages',
      time: '5-10 min',
      difficulty: 'Easy',
      materials: 'None',
    },
    {
      title: 'Calm Parent, Calm Child',
      description: 'When things get tense, try narrating your own regulation: "I\'m feeling frustrated, so I\'m going to take a deep breath." Children learn regulation by watching it — not by being told to calm down.',
      targetSkills: 'Modeling, emotional co-regulation, demonstrating recovery',
      ages: 'All ages',
      time: '2-5 min',
      difficulty: 'Challenge',
      materials: 'None',
    },
    {
      title: 'Family Meeting',
      description: 'Hold a short weekly family check-in: What went well? What was hard? What should we try differently? Everyone gets a voice, including the child. Builds the support system as a team effort.',
      targetSkills: 'Consistency, data-based adjustment, collaborative problem-solving',
      ages: '5-12',
      time: '15-20 min',
      difficulty: 'Medium',
      materials: 'None',
    },
    {
      title: 'Transition Warnings',
      description: 'Practice giving consistent heads-up before transitions: "Five minutes until we leave," "Two more turns, then we\'re done." Predictability is one of the most powerful environmental supports you can provide.',
      targetSkills: 'Prompting, reducing ambiguity, supporting flexibility',
      ages: 'All ages',
      time: '2-5 min',
      difficulty: 'Easy',
      materials: 'Timer (optional)',
    },
  ],
}

/* ─────────────────────────────────────────────
   Filter constants
   ───────────────────────────────────────────── */

const SCOPE_OPTIONS = [
  { value: 'all', label: 'All Domains' },
  { value: 'priority', label: 'Priority Areas Only' },
]

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Challenge', label: 'Challenge' },
]

const TIME_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'quick', label: 'Quick (< 10 min)' },
  { value: 'medium', label: 'Medium (10-20 min)' },
  { value: 'longer', label: 'Longer (20+ min)' },
]

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

/**
 * Parse a time string like "5-10 min" and return its max minutes
 * for filtering purposes.
 */
function parseMaxMinutes(timeStr) {
  const nums = timeStr.match(/\d+/g)
  if (!nums || nums.length === 0) return 10
  return parseInt(nums[nums.length - 1], 10)
}

/**
 * Get the set of domain IDs where the child has at least one
 * skill rated "Needs Work" or "Developing".
 */
function getPriorityDomains(assessments) {
  const priority = new Set()
  framework.forEach((domain) => {
    domain.subAreas.forEach((sa) => {
      sa.skillGroups.forEach((sg) => {
        sg.skills.forEach((skill) => {
          const level = assessments[skill.id]
          if (level === ASSESSMENT_LEVELS.NEEDS_WORK || level === ASSESSMENT_LEVELS.DEVELOPING) {
            priority.add(domain.id)
          }
        })
      })
    })
  })
  return priority
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export default function HomePractice({ assessments = {}, clientName = 'your child' }) {
  const [scopeFilter, setScopeFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [triedActivities, setTriedActivities] = useState(() => {
    try {
      const saved = localStorage.getItem('skillcascade_tried_activities')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })

  const priorityDomains = useMemo(() => getPriorityDomains(assessments), [assessments])

  const filteredActivities = useMemo(() => {
    let entries = []

    // Build flat list of { domainId, activity, isPriority }
    Object.entries(ACTIVITIES).forEach(([domainId, activities]) => {
      const isPriority = priorityDomains.has(domainId)
      activities.forEach((activity) => {
        entries.push({ domainId, activity, isPriority })
      })
    })

    // Scope filter
    if (scopeFilter === 'priority') {
      entries = entries.filter((e) => e.isPriority)
    }

    // Difficulty filter
    if (difficultyFilter !== 'all') {
      entries = entries.filter((e) => e.activity.difficulty === difficultyFilter)
    }

    // Time filter
    if (timeFilter !== 'all') {
      entries = entries.filter((e) => {
        const max = parseMaxMinutes(e.activity.time)
        if (timeFilter === 'quick') return max < 10
        if (timeFilter === 'medium') return max >= 10 && max <= 20
        if (timeFilter === 'longer') return max > 20
        return true
      })
    }

    // Sort: priority domains first, then by domain order
    const domainOrder = framework.map((d) => d.id)
    entries.sort((a, b) => {
      if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1
      return domainOrder.indexOf(a.domainId) - domainOrder.indexOf(b.domainId)
    })

    return entries
  }, [scopeFilter, difficultyFilter, timeFilter, priorityDomains])

  const hasPriority = priorityDomains.size > 0
  const firstName = clientName.split(' ')[0]

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="text-sage-500 mt-0.5">
            {ICONS.home}
          </div>
          <div>
            <h2 className="text-xl font-bold text-warm-800 font-display">
              Activities to Try at Home
            </h2>
            <p className="text-sm text-warm-500 mt-1 leading-relaxed">
              Simple, everyday activities to support {firstName}&rsquo;s growth.
              These are designed to fit naturally into your family&rsquo;s routine &mdash;
              no special training needed.
            </p>
          </div>
        </div>
      </div>

      {/* ── Priority intro ── */}
      {hasPriority && scopeFilter !== 'priority' && (
        <div className="bg-warm-50 rounded-xl border border-warm-200 p-5">
          <div className="flex items-start gap-3">
            <div className="text-warm-400 mt-0.5">{ICONS.sparkle}</div>
            <div>
              <p className="text-sm font-semibold text-warm-700">Suggested starting points</p>
              <p className="text-sm text-warm-500 mt-1 leading-relaxed">
                Activities highlighted at the top focus on areas where {firstName} is
                currently building skills. Start wherever feels most natural for your family.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Controls ── */}
      <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-4">
        <div className="flex items-center gap-2 text-warm-500 mb-3">
          {ICONS.filter}
          <span className="text-sm font-medium text-warm-600">Filter Activities</span>
        </div>
        <div className="flex flex-wrap gap-4">

          {/* Scope */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-warm-400 font-medium">Show</label>
            <div className="flex gap-1">
              {SCOPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setScopeFilter(opt.value)}
                  aria-pressed={scopeFilter === opt.value}
                  className={`text-xs px-3 py-1.5 min-h-[44px] rounded-md transition-colors inline-flex items-center ${
                    scopeFilter === opt.value
                      ? 'bg-sage-500 text-white'
                      : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-warm-400 font-medium">Difficulty</label>
            <div className="flex gap-1">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDifficultyFilter(opt.value)}
                  aria-pressed={difficultyFilter === opt.value}
                  className={`text-xs px-3 py-1.5 min-h-[44px] rounded-md transition-colors inline-flex items-center ${
                    difficultyFilter === opt.value
                      ? 'bg-sage-500 text-white'
                      : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-warm-400 font-medium">Time</label>
            <div className="flex gap-1">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTimeFilter(opt.value)}
                  aria-pressed={timeFilter === opt.value}
                  className={`text-xs px-3 py-1.5 min-h-[44px] rounded-md transition-colors inline-flex items-center ${
                    timeFilter === opt.value
                      ? 'bg-sage-500 text-white'
                      : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Activity Cards ── */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white rounded-xl border border-warm-200 p-8 text-center">
          <p className="text-warm-500 text-sm">
            No activities match your current filters. Try adjusting the filters above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredActivities.map(({ domainId, activity, isPriority }) => {
            const colors = DOMAIN_ACCENTS[domainId]
            const domainLabel = DOMAIN_LABELS[domainId]

            return (
              <div
                key={`${domainId}-${activity.title}`}
                className="bg-white rounded-xl border border-warm-200 shadow-sm overflow-hidden flex"
              >
                {/* Colored left border */}
                <div
                  className="w-1.5 flex-shrink-0"
                  style={{ backgroundColor: colors.border }}
                />

                <div className="flex-1 p-4">
                  {/* Domain label + Priority indicator */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                      }}
                    >
                      {domainLabel}
                    </span>
                    {isPriority && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warm-100 text-warm-600">
                        Priority
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-warm-800 mb-1.5">
                    {activity.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-warm-600 leading-relaxed mb-3">
                    {activity.description}
                  </p>

                  {/* Target skills */}
                  <p className="text-xs text-warm-400 mb-3">
                    <span className="font-medium text-warm-500">Supports:</span>{' '}
                    {activity.targetSkills}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 text-xs text-warm-500 bg-warm-50 px-2 py-1 rounded">
                      {ICONS.people}
                      {activity.ages}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-warm-500 bg-warm-50 px-2 py-1 rounded">
                      {ICONS.clock}
                      {activity.time}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-warm-500 bg-warm-50 px-2 py-1 rounded">
                      {ICONS.star}
                      {activity.difficulty}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-warm-500 bg-warm-50 px-2 py-1 rounded">
                      {ICONS.materials}
                      {activity.materials}
                    </span>
                  </div>

                  {/* Try This button */}
                  {(() => {
                    const actKey = `${domainId}-${activity.title}`
                    const tried = triedActivities.has(actKey)
                    return (
                      <button
                        onClick={() => setTriedActivities((prev) => {
                          const next = new Set(prev)
                          if (tried) next.delete(actKey)
                          else next.add(actKey)
                          localStorage.setItem('skillcascade_tried_activities', JSON.stringify([...next]))
                          return next
                        })}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        style={{
                          backgroundColor: tried ? colors.border : colors.bg,
                          color: tried ? '#fff' : colors.text,
                        }}
                      >
                        {tried ? ICONS.star : ICONS.play}
                        {tried ? 'Tried It!' : 'Try This'}
                      </button>
                    )
                  })()}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Encouragement Tip ── */}
      <div className="bg-sage-50 rounded-xl border border-sage-200 p-5">
        <div className="flex items-start gap-3">
          <div className="text-sage-400 mt-0.5">{ICONS.heart}</div>
          <div>
            <p className="text-sm font-semibold text-sage-700">A gentle reminder</p>
            <p className="text-sm text-sage-600 mt-1 leading-relaxed">
              These are suggestions, not assignments. Every child learns at their own pace.
              Try what feels natural and fun for your family. If something doesn&rsquo;t
              click, set it aside and try something else &mdash; there&rsquo;s no wrong way
              to spend quality time together.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
