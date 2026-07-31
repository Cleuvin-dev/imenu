import Image from "next/image";
import Link from "next/link";
import heroImage from "@/public/brand/hero-qr-experience.png";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="relative flex min-h-[460px] w-full items-center overflow-hidden bg-neutral-950 sm:min-h-[600px] lg:min-h-[680px]">
        <Image
          src={heroImage}
          alt="Cliente escaneando o QR Code da mesa e escolhendo um prato pelo celular, com o pedido chegando em tempo real na cozinha"
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="object-cover object-center sm:object-right"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/60 to-transparent sm:via-neutral-950/40" />

        <div className="relative z-10 flex w-full flex-col gap-6 px-6 py-16 sm:max-w-md sm:px-10 lg:max-w-xl lg:px-16">
          <span className="w-fit rounded-chip bg-primary-600 px-4 py-1 text-sm font-medium text-white">
            iMenu
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Do QR Code ao pedido na cozinha, sem espera pelo garçom.
          </h1>
          <p className="max-w-md text-base text-neutral-200 sm:text-lg">
            O consumidor lê o QR da mesa, escolhe pelo cardápio visual e envia o pedido direto para a operação.
            Sua equipe fica livre para preparar, servir e resolver exceções — não para anotar.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/entrar"
              className="rounded-control bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              Acessar o painel
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-8 px-6 py-16 text-center sm:grid-cols-3 sm:text-left lg:px-16">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary-700">Para o consumidor</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Cardápio com fotos e descrições completas, disponível em segundos, sem esperar atendimento inicial.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary-700">Para a cozinha</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Pedidos chegam no painel em tempo real, com itens, adicionais e observações — sem erro de transcrição.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary-700">Para o estabelecimento</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Cardápio, preços e disponibilidade atualizados na hora, sem reimprimir nada.
          </p>
        </div>
      </section>
    </main>
  );
}
