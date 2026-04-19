import Button from "../../../ui/Button";
import styles from "./SelectButton.module.scss";

const AMOUNTS = ["100", "500", "1000"] as const;

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
