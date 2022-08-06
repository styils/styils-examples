import { addAndMultiply } from '../add'
import { multiplyAndAdd } from '../multiply'
import { commonModuleExport } from '../forked-deadlock/common-module'
import { getValueAB } from '../circular-dep-init/circular-dep-init'
import { styled } from '@styils/react'

const Button = styled('button', {
  color: '#999'
})

export default function Home() {
  commonModuleExport()

  return (
    <>
      <h1>Home</h1>
      <Button>hello home</Button>
      <div>{addAndMultiply(1, 2, 3)}</div>
      <div>{multiplyAndAdd(1, 2, 3)}</div>
      <div className="circ-dep-init">{getValueAB()}</div>
    </>
  )
}
