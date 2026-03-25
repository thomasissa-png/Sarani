import { redirect } from "next/navigation";
import { getAllCaseStudySlugs } from "@/data/case-studies";

export function generateStaticParams() {
  return getAllCaseStudySlugs().map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CaseStudyRedirect({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/work/${slug}`);
}
