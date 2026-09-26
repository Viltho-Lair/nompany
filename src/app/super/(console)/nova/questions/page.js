import { PageHeader } from "../../../_components/ui";
import NovaQuestions from "@/components/super/NovaQuestions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova questions" };

// WHAT NOVA'S HELP DESK COULD NOT ANSWER. Each question here was also emailed to
// support@; this is the copy that records the reply and can teach Nova the
// wording, so the next person is answered without asking a human.
export default function NovaQuestionsPage() {
  return (
    <>
      <PageHeader
        title="Nova questions"
        description="Questions people sent to support from Nova, what Nova offered them, and your replies."
      />
      <NovaQuestions />
    </>
  );
}
