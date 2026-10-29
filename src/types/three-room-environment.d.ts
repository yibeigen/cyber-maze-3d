/**
 * three@0.160 的 package.json exports 与 @types/three 在 bundler 解析下
 * 对 examples/jsm 深导入的类型映射会断链，这里补一条局部声明。
 */
declare module 'three/examples/jsm/environments/RoomEnvironment' {
  import { Scene, WebGLRenderer } from 'three'

  export class RoomEnvironment extends Scene {
    constructor(renderer?: WebGLRenderer | null)
  }
}
