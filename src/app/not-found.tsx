import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <div className="jp text-6xl font-extrabold text-accent">迷子</div>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Nothing here</h1>
      <p className="mt-2 text-muted">That page does not exist — but your streak is safe.</p>
      <ButtonLink href="/" size="lg" className="mt-6">
        Back to today
      </ButtonLink>
    </div>
  );
}
