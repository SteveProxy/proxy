import { Login, LoginEvent } from './login';
import { Listening, ListeningEvent } from './listening';

export type EventName<N extends string> = N;
export type Events =
    LoginEvent
    & ListeningEvent;

export const events = <const>[
    Login,
    Listening
];
