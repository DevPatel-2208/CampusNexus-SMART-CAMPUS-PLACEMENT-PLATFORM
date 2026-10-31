import { Navigate, Route, Routes } from 'react-router-dom';
import ScrollManager from './components/ScrollManager';
import { ProtectedRoute, RoleRoute, PublicOnly } from './routes/guards';
import { AppLayout } from './components/layout';
import { AiWidget } from './components/AiWidget';
import { Login, Register, VerifyEmail, ForgotPassword, OAuthCallback } from './pages/auth';
import { Home, About, Contact, JobsPublic, CompaniesPublic } from './pages/public';
import { JobDetails, OfferLetterPreview, Notifications, Settings, Unauthorized, NotFound } from './pages/shared';
import * as SJ from './pages/StudentJobs';
import * as SD from './pages/StudentDrives';
import * as SA from './pages/StudentAssessments';
import { AssessmentOpen as SecureAssessmentOpen, Exam as SecureExam } from './pages/SecureExam';
import * as AM from './pages/AssessmentMonitoring';
import * as SP from './pages/StudentProfile';
import * as CJ from './pages/CompanyJobs';
import * as CH from './pages/CompanyHiring';
import * as TO from './pages/TpoOverview';
import * as TD from './pages/TpoDrives';
import { useAuth } from './context/AuthContext';

function Role({ role, title, crumb, children }) {
  return <RoleRoute roles={[role]}><AppLayout title={title} crumb={crumb}>{children}</AppLayout></RoleRoute>;
}
function roleHome(role) {
  return role === 'student' ? '/student' : role === 'company' ? '/company' : '/tpo';
}
function RoleHome() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  return <Navigate to={roleHome(user.role)} replace />;
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/jobs" element={<JobsPublic />} />
        <Route path="/jobs/:id" element={<JobDetails />} />
        <Route path="/companies" element={<CompaniesPublic />} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/home" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />

        {/* Student */}
        <Route path="/student" element={<Role role="student" title="Dashboard" crumb="Student"><SJ.Dashboard /></Role>} />
        <Route path="/student/jobs" element={<Role role="student" title="Jobs" crumb="Student / Jobs"><SJ.Jobs /></Role>} />
        <Route path="/student/jobs/:id" element={<Role role="student" title="Job details" crumb="Student / Jobs"><JobDetails canApply /></Role>} />
        <Route path="/student/recommended" element={<Role role="student" title="Recommended" crumb="Student"><SJ.Recommended /></Role>} />
        <Route path="/student/external" element={<Role role="student" title="External jobs" crumb="Student"><SJ.External /></Role>} />
        <Route path="/student/saved" element={<Role role="student" title="Saved jobs" crumb="Student"><SJ.Saved /></Role>} />
        <Route path="/student/drives" element={<Role role="student" title="Placement drives" crumb="Student"><SD.Drives /></Role>} />
        <Route path="/student/drives/:id" element={<Role role="student" title="Drive details" crumb="Student / Drives"><SD.DriveDetails /></Role>} />
        <Route path="/student/applications" element={<Role role="student" title="Applications" crumb="Student"><SD.Applications /></Role>} />
        <Route path="/student/applications/:id" element={<Role role="student" title="Application" crumb="Student / Applications"><SD.ApplicationDetails /></Role>} />
        <Route path="/student/apply-success/:id" element={<Role role="student" title="Application submitted" crumb="Student / Applications"><SD.ApplicationSuccess /></Role>} />
        <Route path="/student/assessments" element={<Role role="student" title="Assessments" crumb="Student"><SA.Assessments /></Role>} />
        <Route path="/student/assessments/:id" element={<Role role="student" title="Assessment" crumb="Student / Assessments"><SecureAssessmentOpen /></Role>} />
        <Route path="/student/exam/:id" element={<RoleRoute roles={['student']}><SecureExam /></RoleRoute>} />
        <Route path="/student/attempt/:id" element={<Role role="student" title="Result" crumb="Student / Assessments"><SA.AttemptResult /></Role>} />
        <Route path="/student/interviews" element={<Role role="student" title="Interviews" crumb="Student"><SA.Interviews /></Role>} />
        <Route path="/student/interviews/:id" element={<Role role="student" title="Interview details" crumb="Student / Interviews"><SA.InterviewDetails /></Role>} />
        <Route path="/student/offers" element={<Role role="student" title="Offers" crumb="Student"><SA.Offers /></Role>} />
        <Route path="/student/offers/:id" element={<Role role="student" title="Offer details" crumb="Student / Offers"><SA.OfferDetails /></Role>} />
        <Route path="/student/offers/:id/letter" element={<Role role="student" title="Offer letter" crumb="Student / Offers"><OfferLetterPreview /></Role>} />
        <Route path="/student/placement" element={<Role role="student" title="Placement status" crumb="Student"><SA.PlacementStatus /></Role>} />
        <Route path="/student/profile" element={<Role role="student" title="Profile" crumb="Student"><SP.Profile /></Role>} />
        <Route path="/student/education" element={<Role role="student" title="Education" crumb="Student"><SP.Education /></Role>} />
        <Route path="/student/skills" element={<Role role="student" title="Skills" crumb="Student"><SP.Skills /></Role>} />
        <Route path="/student/projects" element={<Role role="student" title="Projects" crumb="Student"><SP.Projects /></Role>} />
        <Route path="/student/certifications" element={<Role role="student" title="Certifications" crumb="Student"><SP.Certifications /></Role>} />
        <Route path="/student/resume" element={<Role role="student" title="Resume" crumb="Student"><SP.Resume /></Role>} />
        <Route path="/student/preferences" element={<Role role="student" title="Preferences" crumb="Student"><SP.Preferences /></Role>} />
        <Route path="/student/alerts" element={<Role role="student" title="Job alerts" crumb="Student"><SP.Alerts /></Role>} />
        <Route path="/student/notifications" element={<Role role="student" title="Notifications" crumb="Student"><Notifications /></Role>} />
        <Route path="/student/settings" element={<Role role="student" title="Settings" crumb="Student"><Settings /></Role>} />

        {/* Company */}
        <Route path="/company" element={<Role role="company" title="Dashboard" crumb="Company"><CJ.Dashboard /></Role>} />
        <Route path="/company/reports" element={<Role role="company" title="Reports" crumb="Company"><CJ.CompanyReports /></Role>} />
        <Route path="/company/jobs" element={<Role role="company" title="Jobs" crumb="Company"><CJ.Jobs /></Role>} />
        <Route path="/company/jobs/new" element={<Role role="company" title="Post job" crumb="Company / Jobs"><CJ.JobForm /></Role>} />
        <Route path="/company/jobs/:id/edit" element={<Role role="company" title="Edit job" crumb="Company / Jobs"><CJ.JobForm /></Role>} />
        <Route path="/company/jobs/:id" element={<Role role="company" title="Job details" crumb="Company / Jobs"><CJ.JobDetails /></Role>} />
        <Route path="/company/applications" element={<Role role="company" title="Applications" crumb="Company"><CJ.Applications /></Role>} />
        <Route path="/company/applications/:id" element={<Role role="company" title="Candidate" crumb="Company / Applications"><CJ.ApplicationDetails /></Role>} />
        <Route path="/company/shortlisted" element={<Role role="company" title="Shortlisted" crumb="Company"><CJ.Shortlisted /></Role>} />
        <Route path="/company/selection" element={<Role role="company" title="Selections" crumb="Company"><CH.Selection /></Role>} />
        <Route path="/company/assessments" element={<Role role="company" title="Assessments" crumb="Company"><CH.Assessments /></Role>} />
        <Route path="/company/assessment-results" element={<Role role="company" title="Assessment results" crumb="Company / Assessments"><AM.CompanyAssessmentResults /></Role>} />
        <Route path="/company/assessment-attempts/:id" element={<Role role="company" title="Attempt integrity" crumb="Company / Assessments"><AM.AssessmentAttemptDetail /></Role>} />
        <Route path="/company/assessments/:id" element={<Role role="company" title="Assessment" crumb="Company / Assessments"><CH.AssessmentDetail /></Role>} />
        <Route path="/company/interviews" element={<Role role="company" title="Interviews" crumb="Company"><CH.Interviews /></Role>} />
        <Route path="/company/interviews/new" element={<Role role="company" title="Schedule interview" crumb="Company / Interviews"><CH.InterviewForm /></Role>} />
        <Route path="/company/offers" element={<Role role="company" title="Offers" crumb="Company"><CH.Offers /></Role>} />
        <Route path="/company/offers/new" element={<Role role="company" title="Draft offer" crumb="Company / Offers"><CH.OfferForm /></Role>} />
        <Route path="/company/offers/:id/edit" element={<Role role="company" title="Edit offer" crumb="Company / Offers"><CH.OfferForm /></Role>} />
        <Route path="/company/offers/:id/letter" element={<Role role="company" title="Offer letter" crumb="Company / Offers"><OfferLetterPreview /></Role>} />
        <Route path="/company/profile" element={<Role role="company" title="Profile" crumb="Company"><CH.CompanyProfile /></Role>} />
        <Route path="/company/verification" element={<Role role="company" title="Verification" crumb="Company"><CH.Verification /></Role>} />
        <Route path="/company/notifications" element={<Role role="company" title="Notifications" crumb="Company"><Notifications /></Role>} />
        <Route path="/company/settings" element={<Role role="company" title="Settings" crumb="Company"><Settings /></Role>} />

        {/* TPO */}
        <Route path="/tpo" element={<Role role="tpo" title="Dashboard" crumb="TPO"><TO.Dashboard /></Role>} />
        <Route path="/tpo/analytics" element={<Role role="tpo" title="Analytics" crumb="TPO"><TO.Analytics /></Role>} />
        <Route path="/tpo/students" element={<Role role="tpo" title="Students" crumb="TPO"><TO.Students /></Role>} />
        <Route path="/tpo/students/:id" element={<Role role="tpo" title="Student" crumb="TPO / Students"><TO.StudentDetails /></Role>} />
        <Route path="/tpo/companies" element={<Role role="tpo" title="Companies" crumb="TPO"><TO.Companies /></Role>} />
        <Route path="/tpo/companies/:id" element={<Role role="tpo" title="Company" crumb="TPO / Companies"><TO.CompanyDetails /></Role>} />
        <Route path="/tpo/jobs" element={<Role role="tpo" title="Jobs & approvals" crumb="TPO"><TO.Jobs /></Role>} />
        <Route path="/tpo/drives" element={<Role role="tpo" title="Drives" crumb="TPO"><TD.Drives /></Role>} />
        <Route path="/tpo/drives/new" element={<Role role="tpo" title="New drive" crumb="TPO / Drives"><TD.DriveForm /></Role>} />
        <Route path="/tpo/drives/:id" element={<Role role="tpo" title="Registrations" crumb="TPO / Drives"><TD.DriveRegs /></Role>} />
        <Route path="/tpo/drives/:id/edit" element={<Role role="tpo" title="Edit drive" crumb="TPO / Drives"><TD.DriveForm /></Role>} />
        <Route path="/tpo/calendar" element={<Role role="tpo" title="Drive calendar" crumb="TPO"><TD.TpoCalendar /></Role>} />
        <Route path="/tpo/history" element={<Role role="tpo" title="Drive history" crumb="TPO"><TD.DriveHistory /></Role>} />
        <Route path="/tpo/applications" element={<Role role="tpo" title="Applications" crumb="TPO"><TD.TpoApplications /></Role>} />
        <Route path="/tpo/applications/:id" element={<Role role="tpo" title="Application" crumb="TPO / Applications"><TD.TpoApplicationDetail /></Role>} />
        <Route path="/tpo/assessments" element={<Role role="tpo" title="Assessments" crumb="TPO"><TD.TpoAssessments /></Role>} />
        <Route path="/tpo/assessments/:id/attempts" element={<Role role="tpo" title="Assessment attempts" crumb="TPO / Assessments"><AM.TpoAssessmentAttempts /></Role>} />
        <Route path="/tpo/assessment-attempts/:id" element={<Role role="tpo" title="Attempt integrity" crumb="TPO / Assessments"><AM.AssessmentAttemptDetail /></Role>} />
        <Route path="/tpo/assessments/:id" element={<Role role="tpo" title="Assessment" crumb="TPO / Assessments"><TD.TpoAssessmentDetail /></Role>} />
        <Route path="/tpo/interviews" element={<Role role="tpo" title="Interviews" crumb="TPO"><TD.TpoInterviews /></Role>} />
        <Route path="/tpo/offers" element={<Role role="tpo" title="Offers" crumb="TPO"><TD.TpoOffers /></Role>} />
        <Route path="/tpo/offers/:id/letter" element={<Role role="tpo" title="Offer letter" crumb="TPO / Offers"><OfferLetterPreview /></Role>} />
        <Route path="/tpo/selections" element={<Role role="tpo" title="Selections" crumb="TPO"><TD.Selections /></Role>} />
        <Route path="/tpo/placements" element={<Role role="tpo" title="Placements" crumb="TPO"><TD.Placements /></Role>} />
        <Route path="/tpo/announcements" element={<Role role="tpo" title="Announcements" crumb="TPO"><TD.Announcements /></Role>} />
        <Route path="/tpo/reports" element={<Role role="tpo" title="Reports" crumb="TPO"><TD.Reports /></Role>} />
        <Route path="/tpo/contacts" element={<Role role="tpo" title="Contact messages" crumb="TPO"><TD.Contacts /></Role>} />
        <Route path="/tpo/audit" element={<Role role="tpo" title="Audit logs" crumb="TPO"><TD.Audit /></Role>} />
        <Route path="/tpo/notifications" element={<Role role="tpo" title="Notifications" crumb="TPO"><Notifications /></Role>} />
        <Route path="/tpo/settings" element={<Role role="tpo" title="Settings" crumb="TPO"><Settings /></Role>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <AiWidget />
    </>
  );
}
