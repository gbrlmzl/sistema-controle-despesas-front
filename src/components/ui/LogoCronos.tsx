interface LogoCronosProps {
    size?: number;
}

//Duas moedas sobrepostas: a despesa de um morador cruzando com a de outro — o que
//o Cronos organiza. Usa currentColor pra herdar o branco do container gradiente
//(.marca/.marcaIcone/.pitchIcone), sem precisar de prop de cor.
export default function LogoCronos({ size = 18 }: LogoCronosProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.7" aria-hidden="true">
            <circle cx="9.5" cy="9.5" r="5.5" />
            <circle cx="14.5" cy="14.5" r="5.5" />
        </svg>
    );
}
