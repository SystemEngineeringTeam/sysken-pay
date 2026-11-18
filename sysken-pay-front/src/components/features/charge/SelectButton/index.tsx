import Button from "../../../ui/Button";
import { CHARGE_AMOUNTS } from "../../../../services/chargeAmounts";
import styles from "./SelectButton.module.scss";

const AMOUNTS = CHARGE_AMOUNTS.map(String);

type SelectButtonGroupProps = {
  selectedAmount: string;
  onSelectAmount: (amount: string) => void;
};

export function SelectButtonGroup({ selectedAmount, onSelectAmount }: SelectButtonGroupProps) {
  return (
    <div className={styles.group}>
      {AMOUNTS.map((amount) => (
        <Button
          key={amount}
          size="sm"
          selected={selectedAmount === amount}
          onClick={() => onSelectAmount(amount)}
        >
          ￥{Number(amount).toLocaleString()}
        </Button>
      ))}
    </div>
  );
}

export default SelectButtonGroup;
