'use client';
interface Props {
  title: string;
  body: string;
}

export function AssistantCard({ title, body }: Props) {
  return (
    <div className="card w-96 p-4">
      <h3 className="mb-2 text-base font-semibold">{title}</h3>
      <p className="text-sm">{body}</p>
    </div>
  );
}
