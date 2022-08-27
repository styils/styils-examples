/** @jsxImportSource react */
import * as React from 'react';
import { styled, createGlobal } from '@styils/react';

const Wrapper = styled('div', {
	display: 'grid',
	fontSize: '2em',
	gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
	marginTop: '2em',
	placeItems: 'center',
	backgroundColor: 'hsl(0 0% 50% / 0.1)',
});


createGlobal({
	body:{
		backgroundColor:'cyan'
	}
})


export default function Counter(props: { children: React.ReactNode }) {
	const [count, setCount] = React.useState(0);
	const add = () => setCount((i) => i + 1);
	const subtract = () => setCount((i) => i - 1);


	return (
		<>
			<Wrapper>
				<button onClick={subtract}>-</button>
				<pre>{count}</pre>
				<button onClick={add}>+</button>
			</Wrapper>
		</>
	);
}




