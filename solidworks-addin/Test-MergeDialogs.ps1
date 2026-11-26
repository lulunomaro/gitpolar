[CmdletBinding()]
param([string]$AssemblyDirectory)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
if(-not $AssemblyDirectory){$AssemblyDirectory=Join-Path $PSScriptRoot 'bin-native'}
$references=@('System.dll','System.Core.dll','System.Drawing.dll','System.Windows.Forms.dll','System.Web.Extensions.dll')
foreach($name in @('SolidWorks.Interop.sldworks.dll','SolidWorks.Interop.swpublished.dll','Gitpolar.SolidWorks.dll')){$file=Join-Path $AssemblyDirectory $name;[void][Reflection.Assembly]::LoadFrom($file);$references+=$file}
Add-Type -ReferencedAssemblies $references -TypeDefinition @'
using System;using System.Linq;using System.Collections;using System.Collections.Generic;using System.Drawing;using System.Reflection;using System.Windows.Forms;using Gitpolar.SolidWorks;
public static class MergeDialogTest {
 sealed class Host:Form {public Host(){Opacity=0;ShowInTaskbar=false;}protected override bool ShowWithoutActivation{get{return true;}}}
 static void Check(bool value,string message){if(!value)throw new Exception(message);}
 static IEnumerable<Control> Children(Control parent){foreach(Control child in parent.Controls){yield return child;foreach(Control next in Children(child))yield return next;}}
 public static object Run(){var plan=new Dictionary<string,object>{{"planId","reviewed-plan"},{"result",@"C:\merge\最终总装.SLDASM"},{"files",new object[]{new Dictionary<string,object>{{"source",@"C:\merge\最终总装.SLDASM"},{"target","机器人总装.SLDASM"},{"side","result"}}}}};var type=typeof(GitpolarPane).Assembly.GetType("Gitpolar.SolidWorks.CadMergeResultDialog");
 using(var host=new Host())using(var form=(Form)Activator.CreateInstance(type,BindingFlags.Instance|BindingFlags.Public|BindingFlags.NonPublic,null,new object[]{plan},null)){
  host.ClientSize=form.Size;form.TopLevel=false;host.Controls.Add(form);host.Show();form.Show();Application.DoEvents();var controls=Children(form).ToArray();var apply=controls.OfType<Button>().Single(button=>button.Text=="应用结果并标记解决");var confirm=controls.OfType<CheckBox>().Single();var grid=controls.OfType<DataGridView>().Single();var hint=controls.OfType<Label>().Single(label=>label.Text.StartsWith("应用后仍需"));Check(!apply.Enabled,"Apply was enabled without explicit confirmation.");
  foreach(var size in new Size[]{new Size(1096,619),new Size(860,470)}){form.Size=size;form.PerformLayout();Application.DoEvents();Check(apply.Parent.ClientRectangle.Contains(apply.Bounds),"Apply button is clipped at "+size);Check(!apply.Bounds.IntersectsWith(hint.Bounds),"Apply button overlaps its explanation at "+size);}
  grid.Rows[0].Cells["target"].Value="装配/人工终稿.SLDASM";confirm.Checked=true;Check(apply.Enabled,"Explicit confirmation did not enable Apply.");apply.PerformClick();var values=(Dictionary<string,object>)type.GetField("Values").GetValue(form);Check((bool)values["confirmed"]&&Convert.ToString(values["planId"])=="reviewed-plan","Review identity was lost.");var row=(Dictionary<string,object>)((IEnumerable)values["files"]).Cast<object>().Single();Check(Convert.ToString(row["target"])=="装配/人工终稿.SLDASM","Edited output path was not submitted.");form.Close();host.Close();
 }
 return new {ok=true,defaultAndMinimumSize=true,explicitConfirmation=true,editedPathSubmitted=true};
 }
}
'@
[MergeDialogTest]::Run()|ConvertTo-Json -Compress
