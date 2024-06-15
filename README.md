# OverleapContract

* Router contract: [EQBr7Nj2lBZfUyMQOmg4s3WBSHXae0GhFdjDEqv-lW2nqITC](https://tonviewer.com/EQBr7Nj2lBZfUyMQOmg4s3WBSHXae0GhFdjDEqv-lW2nqITC)
* Admin address: [UQBM6PB3Ha4mpsjm8gVvGc8J6XiftOYgVt3wWZKLk2jYvlT6](https://tonviewer.com/UQBM6PB3Ha4mpsjm8gVvGc8J6XiftOYgVt3wWZKLk2jYvlT6)
* Fee receiver address: [UQC7DEs6CxSkhBkGEEvWxFPVIS4uVjNMD3umVRBw0kwJO6hq](https://tonviewer.com/UQC7DEs6CxSkhBkGEEvWxFPVIS4uVjNMD3umVRBw0kwJO6hq)

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

## How to use

### Build

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`

### Add a new contract

`npx blueprint create ContractName` or `yarn blueprint create ContractName`
