interface Props {
  name: string;
}
export const Name = ({ name }: Props) => {
  return (
    <>
      <span>{name}</span>
    </>
  );
};
