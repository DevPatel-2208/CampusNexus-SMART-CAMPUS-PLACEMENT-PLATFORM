/**
 * CampusNexus - Streamlined Assessments & Questions Seeder
 * Creates 5 professional assessments (1 per company) with 10 questions each
 * for the 5 active companies, ensuring lightweight queries and rapid loading on Render.
 *
 * Run with: node backend/scripts/seed-assessments.js
 */

const mongoose = require('mongoose');
const env = require('../src/config/env');
const { Assessment, AssessmentQuestion } = require('../src/models/Assessment');
const CompanyProfile = require('../src/models/CompanyProfile');
const { Job } = require('../src/models/Job');

const assessmentsData = [
  // 1. NovaTech Solutions - MERN Stack Developer
  {
    companyName: 'NovaTech Solutions',
    jobTitle: 'MERN Stack Developer',
    title: 'MERN Stack Full-Stack Developer Competency Test',
    description: 'Official recruitment screening test evaluating core JavaScript, React component architecture, Node.js backend internals, and MongoDB database design.',
    durationMinutes: 45,
    totalMarks: 100,
    marksPerQuestion: 10,
    difficulty: 'Medium',
    categories: 'Technical',
    technology: 'MERN (React, Node.js, Express, MongoDB)',
    passingPercentage: 60,
    negativeMarking: false,
    questions: [
      {
        question: 'In React, what is the primary role of the "key" prop when rendering dynamic lists of components?',
        questionType: 'MCQ',
        optionA: 'It uniquely binds CSS styles to elements during browser rendering.',
        optionB: 'It assists React’s Virtual DOM reconciliation algorithm to identify which items have changed, been added, or removed.',
        optionC: 'It automatically caches network requests made within list items.',
        optionD: 'It encrypts component state variables inside client memory.',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'Which phase of the Node.js Event Loop executes callbacks scheduled by setImmediate()?',
        questionType: 'MCQ',
        optionA: 'Timers phase',
        optionB: 'Poll phase',
        optionC: 'Check phase',
        optionD: 'Close callbacks phase',
        correctAnswer: 'C',
        marks: 10,
      },
      {
        question: 'When creating a compound index on MongoDB fields { department: 1, salary: -1 }, which query utilizes the index most efficiently?',
        questionType: 'MCQ',
        optionA: 'db.employees.find({ salary: { $gt: 50000 } })',
        optionB: 'db.employees.find({ department: "Engineering" })',
        optionC: 'db.employees.find({ age: { $gte: 25 } })',
        optionD: 'db.employees.find({ bonus: { $exists: true } })',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'In Express.js, how does the framework identify a middleware function specifically designated for centralized error handling?',
        questionType: 'MCQ',
        optionA: 'By registering it with app.onError()',
        optionB: 'By accepting exactly four parameters: (err, req, res, next)',
        optionC: 'By decorating the handler with @ErrorHandler()',
        optionD: 'By returning an HTTP 500 status code synchronously',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'What is the primary mechanism of JavaScript Closures?',
        questionType: 'MCQ',
        optionA: 'A function bundled together with references to its lexical environment, allowing it to access outer variables after the outer function returns.',
        optionB: 'A method to forcibly terminate asynchronous promises before resolution.',
        optionC: 'A memory compaction routine inside the V8 garbage collector.',
        optionD: 'A syntax construct used exclusively to create private class fields in ES6.',
        correctAnswer: 'A',
        marks: 10,
      },
      {
        question: 'When does the cleanup function returned inside a React useEffect hook execute?',
        questionType: 'MCQ',
        optionA: 'Immediately before the initial render of the component.',
        optionB: 'Before re-running the effect on dependency change, and upon component unmounting.',
        optionC: 'Only when an unhandled runtime error is thrown.',
        optionD: 'Synchronously during the browser DOM paint cycle.',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'In MongoDB aggregation, which stage performs a left outer join to an unsharded collection in the same database?',
        questionType: 'MCQ',
        optionA: '$join',
        optionB: '$merge',
        optionC: '$lookup',
        optionD: '$unwind',
        correctAnswer: 'C',
        marks: 10,
      },
      {
        question: 'Which of the following creates a new Promise that settles as soon as any of the input promises settles (either resolves or rejects)?',
        questionType: 'MCQ',
        optionA: 'Promise.all()',
        optionB: 'Promise.race()',
        optionC: 'Promise.allSettled()',
        optionD: 'Promise.any()',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'What is the purpose of React.useMemo hook?',
        questionType: 'MCQ',
        optionA: 'To persist data across browser refreshes in localStorage.',
        optionB: 'To memoize expensive calculations and prevent unnecessary recomputations between re-renders.',
        optionC: 'To bind component functions directly to the global window object.',
        optionD: 'To automatically debounce input event handlers.',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'In Node.js, how does process.nextTick() differ from setImmediate()?',
        questionType: 'MCQ',
        optionA: 'process.nextTick() fires after the next event loop tick, while setImmediate() runs immediately.',
        optionB: 'process.nextTick() callbacks run at the end of the current operation before the event loop continues, while setImmediate() queues for the check phase.',
        optionC: 'They are identical aliases introduced in Node v18.',
        optionD: 'setImmediate() only works inside cluster worker threads.',
        correctAnswer: 'B',
        marks: 10,
      },
    ],
  },

  // 2. CloudVertex Technologies - DevOps & CI/CD Trainee
  {
    companyName: 'CloudVertex Technologies',
    jobTitle: 'DevOps & CI/CD Trainee',
    title: 'DevOps, Docker & CI/CD Fundamentals Assessment',
    description: 'Foundational assessment on containerization principles, Linux command line utilities, CI/CD pipelines, Git workflows, and deployment strategies.',
    durationMinutes: 30,
    totalMarks: 50,
    marksPerQuestion: 10,
    difficulty: 'Medium',
    categories: 'Technical',
    technology: 'DevOps & Cloud',
    passingPercentage: 60,
    negativeMarking: false,
    questions: [
      {
        question: 'Which Dockerfile instruction specifies the base image to inherit from?',
        questionType: 'MCQ',
        optionA: 'RUN',
        optionB: 'FROM',
        optionC: 'BASE',
        optionD: 'COPY',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'Which Linux command is used to display live system resource usage and processes?',
        questionType: 'MCQ',
        optionA: 'ps',
        optionB: 'top',
        optionC: 'df',
        optionD: 'netstat',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'In Git, what does git merge --no-ff accomplish?',
        questionType: 'MCQ',
        optionA: 'Fast-forwards automatically without recording history.',
        optionB: 'Always creates a dedicated merge commit, preserving feature branch history.',
        optionC: 'Aborts merge conflicts automatically.',
        optionD: 'Deletes the source branch after merging.',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'What is the primary role of a CI (Continuous Integration) pipeline?',
        questionType: 'MCQ',
        optionA: 'Manually review pull requests before approval.',
        optionB: 'Automatically build, test, and validate code changes on every commit.',
        optionC: 'Replace production databases.',
        optionD: 'Host static HTML websites.',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'Which HTTP status code signifies a successful request with no response body?',
        questionType: 'MCQ',
        optionA: '200 OK',
        optionB: '201 Created',
        optionC: '204 No Content',
        optionD: '304 Not Modified',
        correctAnswer: 'C',
        marks: 10,
      },
    ],
  },

  // 3. Zentrix Enterprise Solutions - Junior Software Developer
  {
    companyName: 'Zentrix Enterprise Solutions',
    jobTitle: 'Junior Software Developer',
    title: 'Core Software Engineering, Data Structures & OOP Evaluation',
    description: 'Foundational assessment measuring algorithmic problem solving, Big-O complexity, Object-Oriented Programming (OOP) concepts, and relational database fundamentals.',
    durationMinutes: 30,
    totalMarks: 50,
    marksPerQuestion: 10,
    difficulty: 'Medium',
    categories: 'Technical',
    technology: 'Core CS & Data Structures',
    passingPercentage: 60,
    negativeMarking: false,
    questions: [
      {
        question: 'What is the average time complexity of searching for an element in a balanced Binary Search Tree (BST)?',
        questionType: 'MCQ',
        optionA: 'O(1)',
        optionB: 'O(log n)',
        optionC: 'O(n)',
        optionD: 'O(n log n)',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'Which OOP principle is demonstrated when a child class provides a specific implementation of a method declared in its parent class?',
        questionType: 'MCQ',
        optionA: 'Encapsulation',
        optionB: 'Polymorphism (Method Overriding)',
        optionC: 'Composition',
        optionD: 'Abstraction only',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'Which data structure follows the First In First Out (FIFO) order?',
        questionType: 'MCQ',
        optionA: 'Stack',
        optionB: 'Queue',
        optionC: 'Heap',
        optionD: 'Tree',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'In SQL, which clause is used to filter groups created by the GROUP BY statement?',
        questionType: 'MCQ',
        optionA: 'WHERE',
        optionB: 'HAVING',
        optionC: 'ORDER BY',
        optionD: 'LIMIT',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'What does ACID stand for in database management systems?',
        questionType: 'MCQ',
        optionA: 'Accuracy, Consistency, Integrity, Durability',
        optionB: 'Atomicity, Consistency, Isolation, Durability',
        optionC: 'Access, Control, Identification, Delegation',
        optionD: 'Aggregation, Concurrency, Indexing, Distribution',
        correctAnswer: 'B',
        marks: 10,
      },
    ],
  },

  // 4. EduSphere Learning Systems - EdTech Full Stack Engineer (MERN)
  {
    companyName: 'EduSphere Learning Systems',
    jobTitle: 'EdTech Full Stack Engineer (MERN)',
    title: 'EdTech Web Architecture & MERN Stack Screening',
    description: 'Specialized full-stack assessment testing interactive web application development, real-time client-server communication, MongoDB aggregations, and responsive frontend architecture.',
    durationMinutes: 30,
    totalMarks: 50,
    marksPerQuestion: 10,
    difficulty: 'Medium',
    categories: 'Technical',
    technology: 'MERN Stack & Web APIs',
    passingPercentage: 60,
    negativeMarking: false,
    questions: [
      {
        question: 'In React, what hook is used to perform side effects in functional components?',
        questionType: 'MCQ',
        optionA: 'useState',
        optionB: 'useEffect',
        optionC: 'useContext',
        optionD: 'useReducer',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'Which MongoDB aggregation stage is used to filter documents in an aggregation pipeline?',
        questionType: 'MCQ',
        optionA: '$project',
        optionB: '$match',
        optionC: '$group',
        optionD: '$unwind',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'What is CORS in web application architecture?',
        questionType: 'MCQ',
        optionA: 'A database query language',
        optionB: 'A browser security mechanism that restricts cross-origin HTTP requests',
        optionC: 'A CSS preprocessor',
        optionD: 'A Node.js package manager',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'Which protocol is commonly used for bi-directional, full-duplex communication in real-time web apps?',
        questionType: 'MCQ',
        optionA: 'HTTP/1.0',
        optionB: 'WebSocket',
        optionC: 'FTP',
        optionD: 'SMTP',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'What is the purpose of JSON Web Tokens (JWT) in modern web applications?',
        questionType: 'MCQ',
        optionA: 'Database encryption at rest',
        optionB: 'Stateless user authentication and authorization between parties',
        optionC: 'Styling React components',
        optionD: 'Compiling JavaScript to WebAssembly',
        correctAnswer: 'B',
        marks: 10,
      },
    ],
  },

  // 5. AdVantage Digital Media - Digital Marketing & Growth Analyst
  {
    companyName: 'AdVantage Digital Media',
    jobTitle: 'Digital Marketing & Growth Analyst',
    title: 'Digital Marketing & Performance Growth Evaluation',
    description: 'Analytical assessment evaluating marketing metrics (CAC, LTV, ROAS), conversion attribution models, SQL performance analytics, and A/B experimentation methodologies.',
    durationMinutes: 30,
    totalMarks: 50,
    marksPerQuestion: 10,
    difficulty: 'Medium',
    categories: 'Analytical',
    technology: 'Marketing Analytics & SQL',
    passingPercentage: 60,
    negativeMarking: false,
    questions: [
      {
        question: 'What does CAC stand for in digital performance marketing?',
        questionType: 'MCQ',
        optionA: 'Customer Attribution Cost',
        optionB: 'Customer Acquisition Cost',
        optionC: 'Click Attribution Channel',
        optionD: 'Conversion Analysis Calculation',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'In marketing analytics, how is Return on Ad Spend (ROAS) calculated?',
        questionType: 'MCQ',
        optionA: 'Total Revenue ÷ Total Ad Spend',
        optionB: 'Total Clicks ÷ Total Impressions',
        optionC: 'Net Profit ÷ Total Orders',
        optionD: 'Ad Spend ÷ Customer Lifetime Value',
        correctAnswer: 'A',
        marks: 10,
      },
      {
        question: 'Which attribution model gives 100% credit to the touchpoint immediately preceding a purchase?',
        questionType: 'MCQ',
        optionA: 'First-Touch Attribution',
        optionB: 'Last-Touch (Last-Click) Attribution',
        optionC: 'Linear Attribution',
        optionD: 'Time-Decay Attribution',
        correctAnswer: 'B',
        marks: 10,
      },
      {
        question: 'In statistical A/B testing, what does a p-value less than 0.05 indicate?',
        questionType: 'MCQ',
        optionA: 'The test results are statistically significant, rejecting the null hypothesis.',
        optionB: 'The test failed due to low sample size.',
        optionC: 'Variant B is guaranteed to decrease sales.',
        optionD: 'The experiment must run for at least 6 more months.',
        correctAnswer: 'A',
        marks: 10,
      },
      {
        question: 'In SQL, which aggregate function counts only non-null unique occurrences in a column?',
        questionType: 'MCQ',
        optionA: 'COUNT(*)',
        optionB: 'COUNT(DISTINCT column_name)',
        optionC: 'UNIQUE(column_name)',
        optionD: 'DISTINCT(COUNT)',
        correctAnswer: 'B',
        marks: 10,
      },
    ],
  },
];

async function seedAssessments() {
  const mongoUri = process.env.MONGO_URI || env.MONGO_URI || 'mongodb://127.0.0.1:27017/careerconnect';
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);

  let createdAssessments = 0;
  let createdQuestions = 0;

  for (const item of assessmentsData) {
    const company = await CompanyProfile.findOne({
      companyName: { $regex: `^${item.companyName.trim()}$`, $options: 'i' },
    });
    if (!company) {
      console.warn(`Company not found: ${item.companyName}. Skipping.`);
      continue;
    }

    const job = await Job.findOne({
      company: company._id,
      title: { $regex: item.jobTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    });
    if (!job) {
      console.warn(`Job not found for company ${company.companyName}: "${item.jobTitle}". Skipping.`);
      continue;
    }

    let assessment = await Assessment.findOne({ company: company._id, job: job._id });
    if (!assessment) {
      assessment = await Assessment.create({
        company: company._id,
        job: job._id,
        title: item.title,
        description: item.description,
        durationMinutes: item.durationMinutes,
        totalMarks: item.totalMarks,
        marksPerQuestion: item.marksPerQuestion,
        numQuestions: item.questions.length,
        difficulty: item.difficulty,
        categories: item.categories,
        technology: item.technology,
        passingPercentage: item.passingPercentage,
        negativeMarking: item.negativeMarking,
        status: 'active',
      });
      createdAssessments++;

      const questionsToInsert = item.questions.map((q) => ({
        assessment: assessment._id,
        question: q.question,
        questionType: q.questionType || 'MCQ',
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        marks: q.marks || item.marksPerQuestion,
      }));

      await AssessmentQuestion.insertMany(questionsToInsert);
      createdQuestions += questionsToInsert.length;
      console.log(`✅ [Assessment #${createdAssessments}] Linked: "${item.title}" -> Job: ${job.title}`);
    } else {
      console.log(`Assessment already exists for ${company.companyName} -> ${job.title}. Preserving.`);
    }
  }

  console.log(`Seeding complete. Total assessments checked: ${assessmentsData.length}.`);
  await mongoose.disconnect();
}

if (require.main === module) {
  seedAssessments()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = { seedAssessments, assessmentsData };
