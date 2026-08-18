import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client';
/** The board tab's full component props: the framework view seat + the locale seat. */
export type GomokuViewProps = ConvViewProps & PropsLocale<'gomoku'>;
/** The gomoku view tab body. */
export declare function GomokuView({ t }: GomokuViewProps): import("react").JSX.Element;
