import { type CasinoState, createCasinoGame } from './casino.ts';
import { createTresYDosGame, TARGET_WINS, type TresYDosState } from './tresYDos.ts';
import { type CagaoState, createCagaoGame } from './cagao.ts';
import { randomInt } from './cards.ts';
import type { GameId, Player } from './shared.ts';

export type GameState = CasinoState | TresYDosState | CagaoState;

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
      'Para subir una sumatoria, usa una carta de tu mano: su valor aumenta con esa carta. Cualquier jugador puede ampliarla con su carta y cartas sueltas de la mesa. Si tienes en mano otra carta del mismo valor que la sumatoria, puedes convertirla en pares y llevártela después con la última carta de ese valor. Si en la mesa hay una carta suelta de ese mismo valor, puedes unirla en el mismo turno para formar pares. A un par no se le cambia el valor: solo puedes sumarle una carta de su mismo valor, o tu carta junto con cartas sueltas que den justo ese valor (2 y 3 sobre un par de 5), si te queda otra de ese valor en mano. Cualquier jugador puede llevarse una sumatoria o un par ajeno, solo o junto con otras cartas que completen el valor de su carta. Mientras tengas una combinación tuya en la mesa, no puedes gastar tu última carta de cierre en otra jugada que no sea llevártela o reforzarla.',
      'Si te llevas todas las cartas de la mesa haces un virao (1 punto). Si el rival tiene viraos, en lugar de ganar uno le quitas uno suyo. Solo acumulas viraos cuando el rival no tiene ninguno. La última jugada de la ronda no cuenta como virao.',
      'Al terminar una ronda, solo el repartidor de la siguiente puede iniciarla con su botón; si el repartidor es un bot, la inicia sola tras una pausa.',
      'Puntos por ronda: 3 por la mayoría de cartas, 2 por el 10 de diamantes, 1 por el 2 de picas, 1 por la mayoría de picas y 1 por cada as.',
      'Gana el primer equipo que llegue a 21 puntos.',
      'Cierre obligatorio: cuando un equipo empieza una ronda con 17 puntos o más, los ases, el Gran Casino, el Dueño y los viraos dejan de sumarle. Solo puede ganar con la mayoría de cartas (3 puntos) y la mayoría de picas (1 punto), y únicamente la que le falte para llegar a 21 exactos.',
      'Si con 17 puntos consigue solo una de las dos, suma lo logrado y debe conseguir la otra en las rondas siguientes: 17 + mayoría de cartas = 20, y le falta la mayoría de picas; 17 + mayoría de picas = 18, y le falta la mayoría de cartas. Con 19 o 20 puntos le falta la mayoría de picas.',
      'Si los dos equipos completan sus 21 en la misma ronda, gana el que tenga más puntos y, de empatar, el que más puntos hizo en esa ronda.',
    ],
  },
  tresydos: {
    id: 'tresydos',
    name: 'Tres y Dos',
    tagline: 'Roba, bota y canta el 3 y 2: una tercia y un par en tu mano.',
    playerCounts: [2, 3, 4],
    playerCountLabel: 'De 2 a 4 jugadores',
    maxPlayers: 4,
    soloPlayerCount: 3,
    quickRules: [
      'Cada turno robas una carta (del Monte o del Pozo) y botas otra al Pozo: siempre te quedas con 5.',
      'Cantas 3 y 2 cuando tu mano es una tercia y un par, como K-K-K-8-8.',
      'Si robas del Pozo, no puedes botar esa misma carta en ese turno.',
      `Gana la partida quien primero cante ${TARGET_WINS} rondas.`,
    ],
    rules: [
      'Se usa la baraja americana de 52 cartas. Pueden jugar de 2 a 4 personas, cada una por su cuenta.',
      'Cada ronda reparte 5 cartas a cada jugador y pone una boca arriba para empezar el Pozo. El resto forma el Monte, boca abajo. Empieza el jugador que está después del que reparte, y el reparto rota en cada ronda.',
      'En tu turno primero robas: la carta de arriba del Monte o la de arriba del Pozo. Con 6 cartas en la mano, botas una al Pozo. Mientras no hayas robado no puedes botar.',
      'Si tomaste la carta del Pozo, no puedes botar esa misma carta en ese turno. Si la robaste del Monte, puedes botar cualquiera de tus 6.',
      'Ganas la ronda cuando, al botar, te quedan 5 cartas que forman una tercia y un par (tres iguales y dos iguales): eso es cantar el 3 y 2. Cuatro iguales más una distinta no cuenta.',
      'Si el Monte se acaba, las cartas del Pozo (menos la de arriba) se barajan y forman un Monte nuevo.',
      `Cada 3 y 2 vale una ronda ganada. Gana la partida el primero que llegue a ${TARGET_WINS} rondas. Entre rondas, solo el que reparte la siguiente puede iniciarla; si es un bot, la inicia sola tras una pausa.`,
    ],
  },
  cagao: {
    id: 'cagao',
    name: 'El Cagao',
    tagline: 'Empareja todas tus cartas y no te quedes con el A♠: ese es El Cagao.',
    playerCounts: [2, 3, 4, 5, 6],
    playerCountLabel: 'De 2 a 6 jugadores',
    maxPlayers: 6,
    soloPlayerCount: 4,
    quickRules: [
      'Se juega con 49 cartas: la baraja sin tres de los Ases. El A♠ no tiene pareja: es El Cagao.',
      'Al empezar, todos bajan sus pares (dos cartas del mismo número).',
      'En tu turno le robas una carta, a ciegas, al jugador siguiente. Si hace par con una tuya, bajas las dos.',
      'Te salvas cuando te quedas sin cartas. Pierde el último que se queda con El Cagao.',
    ],
    rules: [
      'Se usa la baraja americana de 52 cartas sin los Ases de corazones, diamantes y tréboles: quedan 49 cartas. El único As que queda, el A♠, no tiene pareja y es El Cagao. Pueden jugar de 2 a 6 personas.',
      'Se reparte todo el mazo, una carta a la vez. Algunos jugadores se quedan con una carta más, y eso es normal.',
      'Antes de empezar, todos bajan los pares que tengan: dos cartas del mismo número, sin importar el palo. Tú los bajas tocando una carta que tenga pareja o arrastrándola al centro de la mesa (también está el botón para bajar todos de una vez); los bots lo hacen solos. Si tienes tres iguales, bajas dos y te quedas con la otra. Nadie roba hasta que todos terminen.',
      'Empieza el jugador que está después del que reparte. En tu turno miras las cartas boca abajo del jugador siguiente (el próximo que todavía tenga cartas) y jalas una sin saber cuál es.',
      'Si la carta que robaste hace par con una de tu mano, bajas las dos al momento. Si no, se queda en tu mano. Cuando te roban a ti, tu mano se baraja sola para que nadie sepa dónde quedó cada carta.',
      'Quien se queda sin cartas se salva y sale del juego: ya no roba ni le roban.',
      'La partida termina cuando solo queda un jugador con cartas. Esa persona tiene El Cagao (el A♠) y pierde.',
    ],
  },
};

export function createGameState(game: GameId, players: Player[], dealer?: number): GameState {
  if (game === 'casino') return createCasinoGame(players, dealer);
  if (game === 'tresydos') return createTresYDosGame(players, dealer);
  return createCagaoGame(players, dealer);
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
  return state.phase === 'gameOver';
}
