import {PRecord} from 'prophecy-engine';

export const enum MessageType {
    Info,
    Error,
}

/**
 * Model representing a simple message shown in a dialog box, like alert()
 */
export class ModalMessage extends PRecord({ // TODO: change to plain Immutable.Record w/ Immutable.js 4+
    type: MessageType.Info as MessageType,
    message: '',
    buttonText: 'OK',
}) {
    public static readonly InfoType = MessageType.Info;
    public static readonly ErrorType = MessageType.Error;
}
