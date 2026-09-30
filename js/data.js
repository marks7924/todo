/**
 * data.js \u2014 Seed demo data on first launch
 */

const SeedData = (() => {

  function seed() {
    const today = Utils.todayStr();
    const d = Utils.parseDate(today);

    function addDays(n) {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + n);
      return Utils.formatDateKey(nd);
    }

    // Projects
    const portfolioId = Utils.uid();
    const jsId = Utils.uid();
    const personalId = Utils.uid();

    Store.getState().projects.push(
      {
        id: portfolioId,
        name: 'Portfolio Website',
        description: 'Personal portfolio redesign',
        startDate: today,
        deadline: addDays(10),
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      {
        id: jsId,
        name: 'JavaScript Course',
        description: 'Completing the full JS & React curriculum',
        startDate: addDays(-3),
        deadline: addDays(21),
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      {
        id: personalId,
        name: 'Personal',
        description: 'Personal errands and life admin',
        startDate: null,
        deadline: null,
        status: 'active',
        createdAt: new Date().toISOString(),
      }
    );

    // Tasks \u2014 today
    Store.getState().tasks.push(
      {
        id: Utils.uid(),
        title: 'Finish JavaScript Chapter 4',
        notes: 'Need to finish the exercises and review arrays.',
        status: 'in-progress',
        priority: 'important',
        plannedDate: today,
        time: '10:00',
        estimatedMinutes: 60,
        projectId: jsId,
        recurrenceId: null,
        subtasks: [
          { id: Utils.uid(), title: 'Read lesson', completed: true, order: 0 },
          { id: Utils.uid(), title: 'Watch examples', completed: true, order: 1 },
          { id: Utils.uid(), title: 'Complete exercises', completed: false, order: 2 },
          { id: Utils.uid(), title: 'Review arrays', completed: false, order: 3 },
        ],
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
      {
        id: Utils.uid(),
        title: 'Work on portfolio homepage',
        notes: '',
        status: 'pending',
        priority: 'important',
        plannedDate: today,
        time: '14:00',
        estimatedMinutes: 120,
        projectId: portfolioId,
        recurrenceId: null,
        subtasks: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
      {
        id: Utils.uid(),
        title: 'Read 20 pages',
        notes: '',
        status: 'pending',
        priority: 'normal',
        plannedDate: today,
        time: '21:00',
        estimatedMinutes: 30,
        projectId: personalId,
        recurrenceId: null,
        subtasks: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
      {
        id: Utils.uid(),
        title: 'Clean desk',
        notes: '',
        status: 'completed',
        priority: 'normal',
        plannedDate: today,
        time: null,
        estimatedMinutes: 15,
        projectId: null,
        recurrenceId: null,
        subtasks: [],
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }
    );

    // Tasks \u2014 tomorrow
    Store.getState().tasks.push(
      {
        id: Utils.uid(),
        title: 'Build portfolio navbar',
        notes: '',
        status: 'pending',
        priority: 'normal',
        plannedDate: addDays(1),
        time: '10:00',
        estimatedMinutes: 90,
        projectId: portfolioId,
        recurrenceId: null,
        subtasks: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
      {
        id: Utils.uid(),
        title: 'Study React hooks',
        notes: '',
        status: 'pending',
        priority: 'normal',
        plannedDate: addDays(1),
        time: '09:00',
        estimatedMinutes: 60,
        projectId: jsId,
        recurrenceId: null,
        subtasks: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      }
    );

    // Tasks \u2014 next few days for portfolio project
    Store.getState().tasks.push(
      {
        id: Utils.uid(),
        title: 'Build projects page',
        notes: '',
        status: 'pending',
        priority: 'normal',
        plannedDate: addDays(2),
        time: null,
        estimatedMinutes: 120,
        projectId: portfolioId,
        recurrenceId: null,
        subtasks: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
      {
        id: Utils.uid(),
        title: 'Build contact page',
        notes: '',
        status: 'pending',
        priority: 'normal',
        plannedDate: addDays(3),
        time: null,
        estimatedMinutes: 60,
        projectId: portfolioId,
        recurrenceId: null,
        subtasks: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
      {
        id: Utils.uid(),
        title: 'Make site responsive',
        notes: '',
        status: 'pending',
        priority: 'normal',
        plannedDate: addDays(5),
        time: null,
        estimatedMinutes: 90,
        projectId: portfolioId,
        recurrenceId: null,
        subtasks: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
      {
        id: Utils.uid(),
        title: 'Test and deploy',
        notes: '',
        status: 'pending',
        priority: 'important',
        plannedDate: addDays(8),
        time: null,
        estimatedMinutes: 60,
        projectId: portfolioId,
        recurrenceId: null,
        subtasks: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      }
    );

    // Inbox tasks
    Store.getState().tasks.push(
      {
        id: Utils.uid(),
        title: 'Research React Server Components',
        notes: '',
        status: 'pending',
        priority: 'normal',
        plannedDate: null,
        time: null,
        estimatedMinutes: null,
        projectId: jsId,
        recurrenceId: null,
        subtasks: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
      {
        id: Utils.uid(),
        title: 'Buy noise-cancelling headphones',
        notes: '',
        status: 'pending',
        priority: 'normal',
        plannedDate: null,
        time: null,
        estimatedMinutes: null,
        projectId: null,
        recurrenceId: null,
        subtasks: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
      {
        id: Utils.uid(),
        title: 'Fix portfolio animation bug',
        notes: '',
        status: 'pending',
        priority: 'important',
        plannedDate: null,
        time: null,
        estimatedMinutes: null,
        projectId: portfolioId,
        recurrenceId: null,
        subtasks: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      }
    );

    // Recurring task \u2014 Gym
    Store.getState().recurrences.push({
      id: Utils.uid(),
      title: 'Go to the gym',
      notes: 'Bring water bottle and towel',
      priority: 'normal',
      projectId: null,
      estimatedMinutes: 60,
      frequency: 'custom',
      daysOfWeek: ['1','3','5'], // Mon, Wed, Fri
      startDate: addDays(-7),
      endDate: null,
      time: '17:30',
      completions: {
        [addDays(-7)]: true,
        [addDays(-5)]: true,
        [addDays(-3)]: true,
        [addDays(-1)]: true,
      },
      statuses: {},
      createdAt: new Date().toISOString(),
    });

    // Recurring task \u2014 Morning reading
    Store.getState().recurrences.push({
      id: Utils.uid(),
      title: 'Morning journal',
      notes: '',
      priority: 'normal',
      projectId: null,
      estimatedMinutes: 15,
      frequency: 'daily',
      daysOfWeek: [],
      startDate: addDays(-14),
      endDate: null,
      time: '08:00',
      completions: {},
      statuses: {},
      createdAt: new Date().toISOString(),
    });

    // Calendar Events
    Store.getState().events = [
      {
        id: Utils.uid(),
        title: 'Math Exam',
        date: addDays(4),
        time: '09:00',
        mark: '\ud83d\udd34',
        color: 'red',
        notes: 'Chapters 1 to 5. Bring calculator.',
        recurrence: null,
        recurrenceDays: [],
        createdAt: new Date().toISOString()
      },
      {
        id: Utils.uid(),
        title: 'Project Deadline',
        date: addDays(10),
        time: '17:00',
        mark: '\u25c6',
        color: 'purple',
        notes: 'Final code submission & documentation.',
        recurrence: null,
        recurrenceDays: [],
        createdAt: new Date().toISOString()
      },
      {
        id: Utils.uid(),
        title: 'Weekly Team Sync',
        date: addDays(2),
        time: '11:00',
        mark: 'X',
        color: 'blue',
        notes: 'Discuss sprint goals and milestones.',
        recurrence: 'weekly',
        recurrenceDays: [],
        createdAt: new Date().toISOString()
      },
      {
        id: Utils.uid(),
        title: "Sarah's Birthday",
        date: addDays(6),
        time: null,
        mark: '\u2605',
        color: 'amber',
        notes: 'Send birthday card and gift',
        recurrence: null,
        recurrenceDays: [],
        createdAt: new Date().toISOString()
      },
      {
        id: Utils.uid(),
        title: 'Dentist Appointment',
        date: addDays(12),
        time: '14:30',
        mark: '\ud83d\udccc',
        color: 'green',
        notes: 'Routine checkup and cleaning',
        recurrence: null,
        recurrenceDays: [],
        createdAt: new Date().toISOString()
      }
    ];

    Store.save();
  }

  function ensureSeptemberWork() {
    const state = Store.getState();
    let proj = state.projects.find(p => p.name === 'September work' || p.id === 'september_work_id');
    if (!proj) {
      proj = {
        id: 'september_work_id',
        name: 'September work',
        description: 'Left homework/lectures',
        startDate: Utils.todayStr(),
        deadline: Utils.todayStr(),
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      state.projects.push(proj);
    }

    const septTasks = [
      { id: 'muo3npq75w614', title: 'Tari5 2 ( HW )', status: 'completed', completedAt: new Date().toISOString() },
      { id: 'muo3o5pai3h3x', title: 'Tari5 3 ( HW )', status: 'in-progress', completedAt: null },
      { id: 'muo3p3t8fgphp', title: 'Arabic n7w  ( HW )', status: 'completed', completedAt: new Date().toISOString() },
      { id: 'muo3pocz7mz97', title: 'Arabic nsos  ( HW )', status: 'completed', completedAt: new Date().toISOString() },
      { id: 'muo3pxzq1pra4', title: 'Programming L4  ( HW )', status: 'pending', completedAt: null },
      { id: 'muo3qgdrfdhjj', title: 'English Vocab 1  ( HW )', status: 'completed', completedAt: new Date().toISOString() },
      { id: 'muo3qujv89muf', title: 'English Grammer 1  ( HW )', status: 'pending', completedAt: null },
      { id: 'muo3r6rn9pf8q', title: 'English vocab 2  ( HW )', status: 'completed', completedAt: new Date().toISOString() },
      { id: 'muo3rhbs4v7ch', title: 'English Grammer 2  ( HW )', status: 'pending', completedAt: null },
      { id: 'muo3sxairhort', title: 'Arabic n7w ( HW )', status: 'pending', completedAt: null },
      { id: 'muo3ve8pn95tc', title: 'Arabic nsos ( HW )', status: 'pending', completedAt: null },
      { id: 'muo3w5whq5o3x', title: 'Arabic t3beer ( HW )', status: 'pending', completedAt: null },
      { id: 'muo3y0hcb56dy', title: 'Lecture Arabic T3beer', estimatedMinutes: 45, status: 'pending', completedAt: null },
      { id: 'muo3ydpkzm06d', title: 'Lecture Arabic N7w', estimatedMinutes: 45, status: 'pending', completedAt: null },
      { id: 'muo3yq4qwvs60', title: 'Lecture Arabic Nsos', estimatedMinutes: 90, status: 'pending', completedAt: null }
    ];

    let changed = false;
    septTasks.forEach(st => {
      if (!state.tasks.some(t => t.id === st.id)) {
        state.tasks.push({
          id: st.id,
          title: st.title,
          notes: '',
          status: st.status,
          priority: 'normal',
          plannedDate: null,
          time: null,
          estimatedMinutes: st.estimatedMinutes || null,
          projectId: proj.id,
          recurrenceId: null,
          subtasks: [],
          createdAt: new Date().toISOString(),
          completedAt: st.completedAt || null,
        });
        changed = true;
      }
    });

    if (changed || !state.projects.some(p => p.id === proj.id)) {
      Store.save();
    }
  }

  function isSeeded() {
    const s = Store.getState();
    return s.tasks.length > 0 || s.projects.length > 0 || s.recurrences.length > 0 || (s.events && s.events.length > 0);
  }

  function initIfNeeded() {
    if (!isSeeded()) seed();
    ensureSeptemberWork();
  }

  return { initIfNeeded, seed, ensureSeptemberWork };
})();
