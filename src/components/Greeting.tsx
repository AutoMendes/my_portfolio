interface GreetingProps {
  name: string;
}

export function Greeting({ name }: GreetingProps) {
  return <p className="text-lg font-semibold text-blue-600">Hello, {name}!</p>;
}
