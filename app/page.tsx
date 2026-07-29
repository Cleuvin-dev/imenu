export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <span className="rounded-chip bg-primary-50 px-4 py-1 text-sm font-medium text-primary-700">
        iMenu
      </span>
      <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
        Cardápio digital e pedidos por QR Code
      </h1>
      <p className="max-w-md text-base text-neutral-600">
        Esta é a base da aplicação iMenu, em construção. O cardápio de cada
        estabelecimento fica disponível pelo QR Code exclusivo de cada mesa.
      </p>
    </main>
  );
}
