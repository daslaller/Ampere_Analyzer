"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FileUp, Search, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { extractSpecsFromDatasheet, searchComponentSpecs, type ExtractedSpecs } from "@/app/actions";

interface DatasheetImportProps {
  onSpecsExtracted: (specs: ExtractedSpecs) => void;
}

export function DatasheetImport({ onSpecsExtracted }: DatasheetImportProps) {
  const [isPending, startTransition] = useTransition();
  const [componentName, setComponentName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    confidence?: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      // Auto-extract component name from filename
      const name = selectedFile.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
      if (!componentName) {
        setComponentName(name);
      }
    }
  };

  const handlePdfExtract = () => {
    if (!file || !componentName) return;

    startTransition(async () => {
      setResult(null);
      
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      
      const response = await extractSpecsFromDatasheet(base64, componentName);
      
      if (response.error) {
        setResult({ type: "error", message: response.error });
      } else if (response.data) {
        setResult({
          type: "success",
          message: `Successfully extracted specifications for ${componentName}`,
        });
        onSpecsExtracted(response.data);
      }
    });
  };

  const handleAiSearch = () => {
    if (!componentName) return;

    startTransition(async () => {
      setResult(null);
      
      const response = await searchComponentSpecs(componentName);
      
      if (response.error) {
        setResult({ type: "error", message: response.error });
      } else if (response.data) {
        setResult({
          type: "success",
          message: `Found specifications for ${componentName}`,
          confidence: response.confidence,
        });
        onSpecsExtracted(response.data);
      }
    });
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Component Import
        </CardTitle>
        <CardDescription>
          Upload a datasheet PDF or let AI search for component specifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="search" className="gap-1.5">
              <Search className="h-4 w-4" />
              AI Search
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-1.5">
              <FileUp className="h-4 w-4" />
              Upload PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Component Name</Label>
              <Input
                id="search-name"
                placeholder="e.g., IRF540N, IRFZ44N, 2N7000"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the part number and AI will search its knowledge base for specifications
              </p>
            </div>
            <Button
              onClick={handleAiSearch}
              disabled={!componentName || isPending}
              className="w-full"
            >
              {isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Searching...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Search with AI
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="component-name">Component Name</Label>
              <Input
                id="component-name"
                placeholder="e.g., IRF540N"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdf-upload">Datasheet PDF</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>
              {file && (
                <p className="text-xs text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            <Button
              onClick={handlePdfExtract}
              disabled={!file || !componentName || isPending}
              className="w-full"
            >
              {isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Extracting...
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  Extract from PDF
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {result && (
          <Alert
            className={`mt-4 ${
              result.type === "success"
                ? "border-primary/50 bg-primary/5"
                : "border-destructive/50 bg-destructive/5"
            }`}
          >
            {result.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            <AlertTitle>
              {result.type === "success" ? "Success" : "Error"}
            </AlertTitle>
            <AlertDescription>
              {result.message}
              {result.confidence && (
                <span className="ml-2 text-xs opacity-70">
                  (Confidence: {result.confidence})
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
