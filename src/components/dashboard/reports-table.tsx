import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText } from "lucide-react";
import Link from 'next/link';

type ReportsTableProps = {
  reports: {
    id: string;
    name: string;
    date: string;
    status: string;
  }[];
};

export function ReportsTable({ reports }: ReportsTableProps) {
  return (
    <Card className="h-full bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <FileText />
            Historical Reports
        </CardTitle>
        <CardDescription>
          Access and review previously generated reports.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id} className="transition-colors hover:bg-muted/50">
                <TableCell className="font-medium">{report.name}</TableCell>
                <TableCell>{report.date}</TableCell>
                <TableCell>
                  <Badge variant={report.status === 'Completed' ? 'secondary' : 'outline'} className="border-green-400/50 text-green-400">
                    {report.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" asChild>
                    {/* This now links to the new report detail page */}
                    <Link href={`/reports/${report.id}`}>
                      <ArrowRight className="h-4 w-4" />
                       <span className="sr-only">View Report</span>
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
