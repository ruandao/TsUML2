import * as SimpleAST from "ts-morph";
import * as ts from "typescript";
import { PropertyDetails, MethodDetails, HeritageClause, HeritageClauseType } from "./interfaces";

export function getAst(tsConfigPath: string, sourceFilesPathsGlob?: string) {
    const ast = new SimpleAST.Project({
        tsConfigFilePath: tsConfigPath,
        addFilesFromTsConfig: !sourceFilesPathsGlob
    });
    if (sourceFilesPathsGlob) {
        ast.addSourceFilesAtPaths(sourceFilesPathsGlob);
    }
    return ast;
}

export function parseClasses(classDeclaration: SimpleAST.ClassDeclaration) {
    
    const className = getClassOrInterfaceName(classDeclaration)
    const propertyDeclarations = classDeclaration.getProperties();
    const methodDeclarations = classDeclaration.getMethods();

    const properties = propertyDeclarations.map(property => {
        const sym = property.getSymbol();
        if (sym) {
            return {
                name: sym.getName(),
                type: getPropertyTypeName(sym)
            };
        }
    }).filter((p) => p !== undefined) as PropertyDetails[];

    const methods = methodDeclarations.map(method => {
        const sym = method.getSymbol();
        
        if (sym) {
            return {
                name: sym.getName(),
                returnType: getMethodTypeName(method)
            }
        }
    }).filter((p) => p !== undefined) as MethodDetails[];

    return { className, properties, methods };
}

export function parseInterfaces(interfaceDeclaration: SimpleAST.InterfaceDeclaration) {

    const interfaceName = getClassOrInterfaceName(interfaceDeclaration);
    const propertyDeclarations = interfaceDeclaration.getProperties();
    const methodDeclarations = interfaceDeclaration.getMethods();

  
    const properties = propertyDeclarations.map(property => {
        const sym = property.getSymbol();
        if (sym) {
            const t = sym.getValueDeclaration()?.getType();
            return {
                name: sym.getName(),
                type: getPropertyTypeName(sym)
            }
        }
    }).filter((p) => p !== undefined) as PropertyDetails[];
  
    const methods = methodDeclarations.map(method => {
        const sym = method.getSymbol();
        if (sym) {
            return {
                name: sym.getName(),
                returnType: getMethodTypeName(method)
            }
        }
    }).filter((p) => p !== undefined) as MethodDetails[];
  
    return { interfaceName, properties, methods };
}

export function parseClassHeritageClauses(classDeclaration: SimpleAST.ClassDeclaration ) {

    const className = getClassOrInterfaceName(classDeclaration)
    const baseClass =  classDeclaration.getBaseClass();
    
    let heritageClauses: HeritageClause[] = [];

    if (baseClass) {
        const baseClassName = getClassOrInterfaceName(baseClass)
        heritageClauses.push({
                        clause: baseClassName,
                        className,
                        type: HeritageClauseType.Extends
        });
    }


    return heritageClauses;
}

export function parseInterfaceHeritageClauses(interfaceDeclaration: SimpleAST.InterfaceDeclaration) {

    const ifName = getClassOrInterfaceName(interfaceDeclaration)
    const baseDeclarations =  interfaceDeclaration.getBaseDeclarations();
    
    let heritageClauses: HeritageClause[] = [];

    if (baseDeclarations) {
        baseDeclarations.forEach(bd => {
            const bdName = getClassOrInterfaceName(bd);
            if (bdName) {
                heritageClauses.push(
                    {
                        clause: bdName,
                        className: ifName,
                        type: HeritageClauseType.Implements
                    }
                );
            }
        });
    }

    const implementors = interfaceDeclaration.getImplementations();
    implementors.forEach(impl => {
        const classDecl = impl.getSourceFile().getClass(impl.getNode().getText());
        if (classDecl) {
            heritageClauses.push(
                {
                    clause: ifName,
                    className: getClassOrInterfaceName(classDecl),
                    type: HeritageClauseType.Implements
                }
            );
        }
    })

    return heritageClauses;
}


// utility functions

function getPropertyTypeName(propertySymbol: SimpleAST.Symbol) {
    const t = propertySymbol.getValueDeclaration()?.getType();
    if (!t) {
        return undefined;
    }
    return getTypeAsString(t);
}

function getMethodTypeName(method: SimpleAST.MethodSignature | SimpleAST.MethodDeclaration) {
    return getTypeAsString(method.getReturnType());
}

function getTypeAsString(type?: SimpleAST.Type<SimpleAST.ts.Type>): string | undefined {
    if(!type) {
        return undefined;
    }

    let name;
    if( type.isArray()) {
        const typeArgs = type.getTypeArguments();
        if(typeArgs.length > 0) {
            let elType = type.getTypeArguments()[0];
            name = elType?.getSymbol()?.getName() || elType?.getText();
        }
        
        if(name) {
            return name + "\\[\\]"
        }
        return "\\[\\]"
        
    } else {
        name = type?.getSymbol()?.getName() || type?.getText();
    }

    return name;
}

function getClassOrInterfaceName(classOrIf: SimpleAST.ClassDeclaration | SimpleAST.InterfaceDeclaration | SimpleAST.TypeAliasDeclaration | SimpleAST.ExpressionWithTypeArguments ) {
    let name: string;
    let generics: string[] = [];
    if (classOrIf instanceof SimpleAST.ExpressionWithTypeArguments) {
        return classOrIf.getText();
    }

    name = classOrIf.getSymbol()!.getName();
    const typeParams = classOrIf.getTypeParameters();
    generics= typeParams.map((param) => param.getName()); 
    
    if (generics && generics.length) {
        name += "<" + generics.join(",") + ">";
    }

    return name;
}

