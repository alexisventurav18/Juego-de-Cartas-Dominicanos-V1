import { type CasinoState, createCasinoGame } from './casino';
import { type CinquilloState, createCinquilloGame } from './cinquillo';
import { type BurakoState, createBurakoGame } from './burako';
import { randomInt } from './cards';
import type { GameId, Player } from './shared';

export type GameState = CasinoState | CinquilloState | BurakoState;

export interface GameInfo {
  id: GameId;
  name: string;
  tagline: string;
  playerCounts: number[];
  playerCountLabel: string;
  maxPlayers: number;
  soloPlayerCount: number;
  rules: string[];
  quickRules?: string[];
}

export const GAMES: Record<GameId, GameInfo> = {
  casino: {
    id: 'casino',
    name: 'Casino',
    tagline: 'Captura cartas sumando o igualando valores y gana puntos por los premios clave.',
    playerCounts: [2, 4],
    playerCountLabel: '2 o 4 jugadores (en parejas)',
    maxPlayers: 4,
    soloPlayerCount: 4,
    quickRules: [
      'Captura: juega una carta de tu mano y llévate cartas de la mesa del mismo valor, o cuyo total sea ese valor.',
      'Suma: junta tu carta con cartas de la mesa para formar una suma, y llévatela después con otra carta de ese valor.',
      'Gana el primer equipo que llegue a 21 puntos.',
      'Zona de Cierre: con 17 puntos o más solo sumas con las mayorías que te faltan para llegar a 21 exactos.',
    ],
    rules: [
      'Se usa la baraja americana de 52 cartas. Con 4 jugadores, las parejas son los que se sientan frente a frente.',
      'Cada jugador recibe 4 cartas y se ponen 4 boca arriba en el centro. Al empezar, un sorteo elige quién reparte (contra bots, un volado de cara o cruz); el reparto rota cada ronda. Los Ases, el 10 de diamantes, el 2 de picas y las espadas salen menos en la mano inicial.',
      'Valores: del 2 al 10 su número, J vale 11, Q vale 12, K vale 13 y el As vale 1 o 14.',
      'En tu turno juega una carta de tu mano para llevarte cartas de la mesa: una carta suelta del mismo valor, o cartas sueltas que sumen el valor de tu carta. También puedes llevarte varios grupos de cartas sueltas (pares) si cada grupo suma el valor de tu carta, como K con Q y A.',
      'Si ya formaste una combinación y en tu turno no puedes formar ni capturar algo nuevo, debes llevarte tu propia combinación. Si no has formado nada, puedes dejar tu carta en la mesa aunque haya capturas posibles.',
      'Sumatoria: une tu carta con cartas sueltas de la mesa; su valor es la suma de todas. Pares: tu carta y las demás cartas sueltas suman el valor de una carta suelta de la mesa, y se agrupan con ella. En ambos casos debe quedarte en mano una carta de ese valor.',
      'Para subir una sumatoria, usa una carta de tu mano: su valor aumenta con esa carta. Cualquier jugador puede ampliarla con su carta y cartas sueltas de la mesa. Si tienes en mano otra carta del mismo valor que la sumatoria, puedes convertirla en pares y llevártela después con la última carta de ese valor. Si en la mesa hay una carta suelta de ese mismo valor, puedes unirla en el mismo turno para formar pares. A un par solo puedes sumarle cartas de su mismo valor, si te queda otra de ese valor en mano. Un rival no puede llevarse una sumatoria junto con cartas sueltas.',
      'Si te llevas todas las cartas de la mesa haces un virao (1 punto). Si el rival tiene viraos, en lugar de ganar uno le quitas uno suyo. Solo acumulas viraos cuando el rival no tiene ninguno. La última jugada de la ronda no cuenta como virao.',
      'Al terminar una ronda, solo el repartidor de la siguiente puede iniciarla con su botón; si el repartidor es un bot, la inicia sola tras una pausa.',
      'Puntos por ronda: 3 por la mayoría de cartas, 2 por el 10 de diamantes, 1 por el 2 de picas, 1 por la mayoría de picas y 1 por cada as.',
      'Gana el primer equipo que llegue a 21 puntos.',
      'Cierre obligatorio: cuando un equipo empieza una ronda con 17 puntos o más, los ases, el Gran Casino, el Dueño y los viraos dejan de sumarle. Solo puede ganar con la mayoría de cartas (3 puntos) y la mayoría de picas (1 punto), y únicamente la que le falte para llegar a 21 exactos.',
      'Si con 17 puntos consigue solo una de las dos, suma lo logrado y debe conseguir la otra en las rondas siguientes: 17 + mayoría de cartas = 20, y le falta la mayoría de picas; 17 + mayoría de picas = 18, y le falta la mayoría de cartas. Con 19 o 20 puntos le falta la mayoría de picas.',
      'Si los dos equipos completan sus 21 en la misma ronda, gana el que tenga más puntos y, de empatar, el que más puntos hizo en esa ronda.',
    ],
  },
  cinquillo: {
    id: 'cinquillo',
    name: 'Cinquillo',
    tagline: 'Monta escaleras desde el 5 y sé el primero en quedarte sin cartas.',
    playerCounts: [3, 4, 5, 6],
    playerCountLabel: 'De 3 a 6 jugadores',
    maxPlayers: 6,
    soloPlayerCount: 3,
    rules: [
      'Se reparte toda la baraja americana de 52 cartas entre los jugadores.',
      'Empieza quien tiene el 5 de diamantes.',
      'Coloca cartas en escalera subiendo o bajando desde el 5 del mismo palo. El As va antes del 2 y el Rey después de la Dama. Los demás 5 abren su propia fila cuando sale el de diamantes.',
      'Si no tienes una carta que encaje, pasas el turno.',
      'Gana quien se quede primero sin cartas. Si todos pasan seguidos, gana quien tenga menos cartas en la mano.',
    ],
  },
  burako: {
    id: 'burako',
    name: 'Burako',
    tagline: 'Forma juegos y canastas en parejas y llega primero a 3.000 puntos.',
    playerCounts: [2, 4],
    playerCountLabel: '2 o 4 jugadores (en parejas)',
    maxPlayers: 4,
    soloPlayerCount: 4,
    rules: [
      'Se juega con dos barajas americanas y 4 comodines. Cada jugador recibe 11 cartas y cada pareja tiene un muerto de 11 cartas.',
      'En tu turno roba una carta o levanta el pozo usando su carta de arriba. Puedes bajar juegos y luego descartas una carta.',
      'Juegos: tríos del mismo número o escaleras del mismo palo de 3 o más cartas. Los 2 y los comodines sirven de carta libre.',
      'Canastas de 7 o más cartas: limpias si no tienen comodines, sucias si los tienen. Para cerrar, la pareja necesita al menos una de cada tipo.',
      'Cuando te quedas sin cartas tomas el muerto. Si tu pareja ya cumple las canastas, cierras la ronda.',
      'Puntos: juegos bajados, canastas (limpia 200, sucia 100), 100 por cierre, menos las cartas que quedan en mano. Gana la pareja que llegue a 3.000.',
    ],
  },
};

export function createGameState(game: GameId, players: Player[], dealer?: number): GameState {
  if (game === 'casino') return createCasinoGame(players, dealer);
  if (game === 'cinquillo') return createCinquilloGame(players);
  return createBurakoGame(players);
}

export function createSoloPlayers(game: GameId, human: Player, playerCount = GAMES[game].soloPlayerCount): Player[] {
  const botNames = [
    'Santiago',
    'Valentina',
    'Mateo',
    'Camila',
    'Sebastián',
    'Luciana',
    'Gabriel',
    'Daniela',
  ];
  const availableNames = [...botNames];
  const bots = Array.from({ length: playerCount - 1 }, (_, i) => {
    const nameIndex = randomInt(availableNames.length);
    const [name] = availableNames.splice(nameIndex, 1);
    return { id: `bot-${i + 1}`, name };
  });
  return [human, ...bots];
}

export function canStartGame(game: GameId, playerCount: number): boolean {
  return GAMES[game].playerCounts.includes(playerCount);
}

export function isGameFinished(state: GameState): boolean {
  if (state.game === 'cinquillo') return state.phase === 'finished';
  return state.phase === 'gameOver';
}
