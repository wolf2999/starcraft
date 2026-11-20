import { LabelButton } from '../LabelButton';
import type { ICellRenderer } from './ICellRenderer';
import type { ListData } from './ListData';
export declare class CellRenderer extends LabelButton implements ICellRenderer {
    protected static defaultStyles: Record<string, unknown>;
    protected _listData: ListData | null;
    protected _data: unknown;
    constructor();
    get listData(): ListData | null;
    set listData(value: ListData | null);
    get data(): unknown;
    set data(value: unknown);
    protected drawLayout(): void;
}
